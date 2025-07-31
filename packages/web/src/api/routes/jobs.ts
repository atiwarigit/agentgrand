import { Router } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { database } from '../database/connection'
import { asyncHandler, createError } from '../middleware/errorHandler'

const router = Router()

// GET /api/jobs/:id - Get job status
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const jobId = req.params.id
  const userId = req.user.id

  const job = await database.queryOne(`
    SELECT * FROM processing_jobs 
    WHERE id = $1 AND user_id = $2
  `, [jobId, userId])

  if (!job) {
    throw createError('Job not found', 404)
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress || { stage: 'queued', percentage: 0 },
    result: job.result,
    error: job.error_message,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at
  })
}))

// GET /api/jobs - Get user's jobs
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const status = req.query.status as string

  let query = `
    SELECT j.*, p.name as project_name
    FROM processing_jobs j
    LEFT JOIN projects p ON j.project_id = p.id
    WHERE j.user_id = $1
  `
  const params = [userId]

  if (status) {
    query += ` AND j.status = $2`
    params.push(status)
  }

  query += ` ORDER BY j.created_at DESC LIMIT 50`

  const jobs = await database.query(query, params)

  res.json(jobs.map(job => ({
    id: job.id,
    projectId: job.project_id,
    projectName: job.project_name,
    type: job.job_type,
    status: job.status,
    progress: job.progress || { stage: 'queued', percentage: 0 },
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    error: job.error_message
  })))
}))

// GET /api/jobs/active - Get active jobs for rate limiting
router.get('/active', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  const activeJobs = await database.query(`
    SELECT id, status, progress, created_at
    FROM processing_jobs 
    WHERE user_id = $1 
    AND status IN ('queued', 'processing')
    ORDER BY created_at DESC
  `, [userId])

  res.json(activeJobs.map(job => ({
    id: job.id,
    status: job.status,
    progress: job.progress ? job.progress.percentage || 0 : 0,
    createdAt: job.created_at
  })))
}))

// DELETE /api/jobs/:id - Cancel job (if possible)
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const jobId = req.params.id
  const userId = req.user.id

  const job = await database.queryOne(`
    SELECT * FROM processing_jobs 
    WHERE id = $1 AND user_id = $2
  `, [jobId, userId])

  if (!job) {
    throw createError('Job not found', 404)
  }

  if (job.status === 'completed' || job.status === 'failed') {
    throw createError('Cannot cancel completed or failed job', 400)
  }

  // Update job status to cancelled
  await database.update('processing_jobs', jobId, {
    status: 'failed',
    error_message: 'Cancelled by user',
    completed_at: new Date()
  })

  res.status(204).send()
}))

export default router