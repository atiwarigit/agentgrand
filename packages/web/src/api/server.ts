import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import { database } from './database/connection'
import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/rateLimit'
import { quotaMiddleware } from './middleware/quota'
import { errorHandler } from './middleware/errorHandler'
import projectRoutes from './routes/projects'
import fileRoutes from './routes/files'
import jobRoutes from './routes/jobs'
import regenerationRoutes from './routes/regeneration'
import complianceRoutes from './routes/compliance'
import downloadRoutes from './routes/download'
import quotaRoutes from './routes/quota'

const app = express()
const PORT = process.env.PORT || 8000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
app.use(rateLimitMiddleware)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// API routes with authentication
app.use('/api/projects', authMiddleware, projectRoutes)
app.use('/api/files', authMiddleware, fileRoutes)
app.use('/api/jobs', authMiddleware, jobRoutes)
app.use('/api/regenerate', authMiddleware, quotaMiddleware, regenerationRoutes)
app.use('/api/compliance', authMiddleware, complianceRoutes)
app.use('/api/download', authMiddleware, downloadRoutes)
app.use('/api/quota', authMiddleware, quotaRoutes)

// Process endpoint for file upload and analysis
app.post('/api/process', 
  authMiddleware,
  quotaMiddleware,
  multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Invalid file type. Only PDF, CSV, and XLSX files are allowed.'))
      }
    }
  }).array('files', 10),
  async (req, res, next) => {
    try {
      const { projectId, customPrompts } = req.body
      const files = req.files as Express.Multer.File[]
      const userId = req.user.id

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' })
      }

      // Create processing job
      const job = await database.insert('processing_jobs', {
        project_id: projectId,
        user_id: userId,
        job_type: 'ingest',
        status: 'queued',
        input_data: {
          files: files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })),
          customPrompts: customPrompts ? JSON.parse(customPrompts) : {}
        }
      })

      // Queue processing (in production, this would use a job queue like Bull/BullMQ)
      setImmediate(async () => {
        try {
          const { processFiles } = await import('./services/fileProcessor')
          await processFiles(job.id, files, projectId, userId)
        } catch (error) {
          console.error('File processing error:', error)
          await database.update('processing_jobs', job.id, {
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date()
          })
        }
      })

      res.json({
        jobId: job.id,
        status: 'queued',
        progress: { stage: 'queued', percentage: 0 }
      })
    } catch (error) {
      next(error)
    }
  }
)

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

async function startServer() {
  try {
    // Initialize database connection
    await database.connect()
    
    // Initialize schema if needed
    if (process.env.INIT_DB === 'true') {
      await database.initializeSchema()
    }

    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully')
  await database.disconnect()
  process.exit(0)
})

// Start server
startServer()

export default app