import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth'
import { database } from '../database/connection'

export const quotaMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user.id
    
    // Check if this is a regeneration request
    if (req.path.includes('/regenerate')) {
      const quota = await database.checkRegenerationQuota(userId)
      
      if (quota.used >= quota.limit) {
        res.status(429).json({
          error: 'Regeneration quota exceeded',
          quota: {
            used: quota.used,
            limit: quota.limit,
            resetDate: quota.reset_date
          }
        })
        return
      }
    }
    
    // Check concurrent processing jobs
    if (req.path.includes('/process')) {
      const activeJobs = await database.query(
        `SELECT COUNT(*) as count FROM processing_jobs 
         WHERE user_id = $1 AND status IN ('queued', 'processing')`,
        [userId]
      )
      
      const maxConcurrentJobs = 2 // Configurable limit
      if (activeJobs[0]?.count >= maxConcurrentJobs) {
        res.status(429).json({
          error: 'Too many concurrent processing jobs',
          limit: maxConcurrentJobs,
          active: activeJobs[0].count
        })
        return
      }
    }
    
    // Check project limits
    if (req.method === 'POST' && req.path.includes('/projects')) {
      const projectCount = await database.query(
        'SELECT COUNT(*) as count FROM projects WHERE owner_id = $1',
        [userId]
      )
      
      const maxProjects = 2 // Per spec: max 2 open projects per user
      if (projectCount[0]?.count >= maxProjects) {
        res.status(429).json({
          error: 'Project limit exceeded',
          limit: maxProjects,
          current: projectCount[0].count
        })
        return
      }
    }
    
    next()
  } catch (error) {
    console.error('Quota check error:', error)
    next() // Continue on error to avoid blocking legitimate requests
  }
}