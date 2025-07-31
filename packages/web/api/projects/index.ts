import { VercelRequest, VercelResponse } from '@vercel/node'
import { createConnection } from '../../src/api/database/vercel-connection'
import { authMiddleware } from '../../src/api/middleware/vercel-auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Apply CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    // Authenticate user
    const user = await authMiddleware(req)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const db = await createConnection()

    if (req.method === 'GET') {
      // Get all projects for user
      const projects = await db.query(`
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
      `, [user.id])

      return res.status(200).json(projects.rows)
    }

    if (req.method === 'POST') {
      const { name, description } = req.body

      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' })
      }

      // Check project limit
      const projectCount = await db.query(
        'SELECT COUNT(*) as count FROM projects WHERE owner_id = $1',
        [user.id]
      )

      if (parseInt(projectCount.rows[0].count) >= 2) {
        return res.status(429).json({
          error: 'Project limit exceeded',
          limit: 2,
          current: projectCount.rows[0].count
        })
      }

      // Create project
      const result = await db.query(`
        INSERT INTO projects (name, description, owner_id, status, grant_data, regenerations_used, max_regenerations)
        VALUES ($1, $2, $3, 'draft', '{}', 0, 10)
        RETURNING *
      `, [name, description, user.id])

      const project = result.rows[0]

      // Add owner as collaborator
      await db.query(`
        INSERT INTO project_collaborators (project_id, user_id, role, accepted_at)
        VALUES ($1, $2, 'owner', NOW())
      `, [project.id, user.id])

      return res.status(201).json(project)
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}