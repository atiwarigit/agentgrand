import { Router } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { database } from '../database/connection'
import { documentGenerator } from '../services/documentGenerator'
import { asyncHandler, createError } from '../middleware/errorHandler'

const router = Router()

// GET /api/download/projects/:id - Download project as DOCX or PDF
router.get('/projects/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id
  const userId = req.user.id
  const format = req.query.format as 'docx' | 'pdf'

  if (!format || !['docx', 'pdf'].includes(format)) {
    throw createError('Invalid format. Must be "docx" or "pdf"', 400)
  }

  // Check if user has access to the project
  const project = await database.queryOne(`
    SELECT p.*, u.name as owner_name, u.email as owner_email
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = $1 
      AND (p.owner_id = $2 
           OR p.id IN (
             SELECT project_id FROM project_collaborators 
             WHERE user_id = $2 AND accepted_at IS NOT NULL
           ))
  `, [projectId, userId])

  if (!project) {
    throw createError('Project not found or access denied', 404)
  }

  try {
    let buffer: Buffer
    let contentType: string
    let filename: string

    if (format === 'docx') {
      buffer = await documentGenerator.generateDOCX(project)
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
    } else {
      buffer = await documentGenerator.generatePDF(project)
      contentType = 'application/pdf'
      filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString()
    })

    res.send(buffer)

    // Log the download
    await database.insert('audit_log', {
      user_id: userId,
      action: 'download',
      resource_type: 'project',
      resource_id: projectId,
      details: { format, filename },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    })

  } catch (error) {
    console.error('Error generating document:', error)
    throw createError('Failed to generate document', 500)
  }
}))

export default router