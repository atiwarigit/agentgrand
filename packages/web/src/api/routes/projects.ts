import { Router } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { database } from '../database/connection'
import { asyncHandler, createError } from '../middleware/errorHandler'

const router = Router()

// GET /api/projects - Get all projects for user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  
  const projects = await database.query(`
    SELECT p.*, 
           u.name as owner_name, u.email as owner_email,
           COUNT(pc.id) as collaborator_count
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    LEFT JOIN project_collaborators pc ON p.id = pc.project_id
    WHERE p.owner_id = $1 
       OR p.id IN (
         SELECT project_id FROM project_collaborators 
         WHERE user_id = $1 AND accepted_at IS NOT NULL
       )
    GROUP BY p.id, u.name, u.email
    ORDER BY p.updated_at DESC
  `, [userId])

  res.json(projects)
}))

// GET /api/projects/:id - Get specific project
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id
  const userId = req.user.id

  const project = await database.queryOne(`
    SELECT p.*, 
           u.name as owner_name, u.email as owner_email
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

  // Get collaborators
  const collaborators = await database.query(`
    SELECT pc.role, pc.invited_at, pc.accepted_at,
           u.id, u.name, u.email
    FROM project_collaborators pc
    JOIN users u ON pc.user_id = u.id
    WHERE pc.project_id = $1
  `, [projectId])

  res.json({
    ...project,
    collaborators
  })
}))

// POST /api/projects - Create new project
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, description } = req.body
  const userId = req.user.id

  if (!name || !description) {
    throw createError('Name and description are required', 400)
  }

  const project = await database.insert('projects', {
    name,
    description,
    owner_id: userId,
    status: 'draft',
    grant_data: {},
    regenerations_used: 0,
    max_regenerations: 10
  })

  // Add owner as collaborator
  await database.insert('project_collaborators', {
    project_id: project.id,
    user_id: userId,
    role: 'owner',
    accepted_at: new Date()
  })

  res.status(201).json(project)
}))

// PATCH /api/projects/:id - Update project
router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id
  const userId = req.user.id
  const updates = req.body

  // Check permissions
  const hasPermission = await database.queryOne(`
    SELECT 1 FROM projects p
    LEFT JOIN project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = $1 
      AND (p.owner_id = $2 
           OR (pc.user_id = $2 AND pc.role IN ('owner', 'editor') AND pc.accepted_at IS NOT NULL))
  `, [projectId, userId])

  if (!hasPermission) {
    throw createError('Permission denied', 403)
  }

  // Filter allowed fields
  const allowedFields = ['name', 'description', 'status', 'grant_data']
  const safeUpdates = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key]
      return obj
    }, {} as any)

  if (Object.keys(safeUpdates).length === 0) {
    throw createError('No valid fields to update', 400)
  }

  const project = await database.update('projects', projectId, safeUpdates)
  
  if (!project) {
    throw createError('Project not found', 404)
  }

  res.json(project)
}))

// DELETE /api/projects/:id - Delete project
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id
  const userId = req.user.id

  // Only owner can delete
  const project = await database.queryOne(
    'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
    [projectId, userId]
  )

  if (!project) {
    throw createError('Project not found or permission denied', 404)
  }

  await database.delete('projects', projectId)
  res.status(204).send()
}))

// POST /api/projects/:id/collaborators - Invite collaborator
router.post('/:id/collaborators', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id
  const userId = req.user.id
  const { email, role } = req.body

  if (!email || !role || !['editor', 'viewer'].includes(role)) {
    throw createError('Valid email and role (editor/viewer) required', 400)
  }

  // Check if user is owner or editor
  const hasPermission = await database.queryOne(`
    SELECT 1 FROM projects p
    LEFT JOIN project_collaborators pc ON p.id = pc.project_id
    WHERE p.id = $1 
      AND (p.owner_id = $2 
           OR (pc.user_id = $2 AND pc.role IN ('owner', 'editor') AND pc.accepted_at IS NOT NULL))
  `, [projectId, userId])

  if (!hasPermission) {
    throw createError('Permission denied', 403)
  }

  // Find user by email
  const invitedUser = await database.queryOne(
    'SELECT id FROM users WHERE email = $1',
    [email]
  )

  if (!invitedUser) {
    throw createError('User not found', 404)
  }

  // Check if already collaborator
  const existingCollaborator = await database.queryOne(
    'SELECT 1 FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [projectId, invitedUser.id]
  )

  if (existingCollaborator) {
    throw createError('User is already a collaborator', 409)
  }

  // Create collaboration
  await database.insert('project_collaborators', {
    project_id: projectId,
    user_id: invitedUser.id,
    role,
    accepted_at: new Date() // Auto-accept for MVP
  })

  res.status(201).json({ message: 'Collaborator added successfully' })
}))

// DELETE /api/projects/:id/collaborators/:userId - Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const projectId = req.params.id
  const collaboratorId = req.params.collaboratorId
  const userId = req.user.id

  // Check if user is owner
  const project = await database.queryOne(
    'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
    [projectId, userId]
  )

  if (!project) {
    throw createError('Permission denied', 403)
  }

  await database.query(
    'DELETE FROM project_collaborators WHERE project_id = $1 AND user_id = $2',
    [projectId, collaboratorId]
  )

  res.status(204).send()
}))

export default router