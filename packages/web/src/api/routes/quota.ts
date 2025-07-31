import { Router } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { database } from '../database/connection'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// GET /api/quota/regenerations - Get regeneration quota for user
router.get('/regenerations', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  const quota = await database.checkRegenerationQuota(userId)

  res.json({
    used: quota.used,
    limit: quota.limit,
    remaining: quota.limit - quota.used,
    resetDate: quota.reset_date,
    canRegenerate: quota.used < quota.limit
  })
}))

// GET /api/quota/projects - Get project quota for user
router.get('/projects', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  const projectCount = await database.query(
    'SELECT COUNT(*) as count FROM projects WHERE owner_id = $1',
    [userId]
  )

  const maxProjects = 2 // Per spec
  const currentCount = parseInt(projectCount[0]?.count || '0')

  res.json({
    used: currentCount,
    limit: maxProjects,
    remaining: maxProjects - currentCount,
    canCreate: currentCount < maxProjects
  })
}))

// GET /api/quota/jobs - Get active job quota
router.get('/jobs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  const activeJobs = await database.query(
    `SELECT COUNT(*) as count FROM processing_jobs 
     WHERE user_id = $1 AND status IN ('queued', 'processing')`,
    [userId]
  )

  const maxActiveJobs = 2 // Per spec: 1 concurrent job per org, but allowing 2 for user experience
  const currentCount = parseInt(activeJobs[0]?.count || '0')

  res.json({
    used: currentCount,
    limit: maxActiveJobs,
    remaining: maxActiveJobs - currentCount,
    canProcess: currentCount < maxActiveJobs
  })
}))

// GET /api/quota/usage - Get comprehensive usage statistics
router.get('/usage', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  // Get regeneration quota
  const regenerationQuota = await database.checkRegenerationQuota(userId)

  // Get project count
  const projectCount = await database.query(
    'SELECT COUNT(*) as count FROM projects WHERE owner_id = $1',
    [userId]
  )

  // Get active jobs
  const activeJobs = await database.query(
    `SELECT COUNT(*) as count FROM processing_jobs 
     WHERE user_id = $1 AND status IN ('queued', 'processing')`,
    [userId]
  )

  // Get total processing jobs this month
  const monthlyJobs = await database.query(
    `SELECT COUNT(*) as count FROM processing_jobs 
     WHERE user_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)`,
    [userId]
  )

  res.json({
    regenerations: {
      used: regenerationQuota.used,
      limit: regenerationQuota.limit,
      remaining: regenerationQuota.limit - regenerationQuota.used,
      resetDate: regenerationQuota.reset_date
    },
    projects: {
      used: parseInt(projectCount[0]?.count || '0'),
      limit: 2,
      remaining: 2 - parseInt(projectCount[0]?.count || '0')
    },
    activeJobs: {
      used: parseInt(activeJobs[0]?.count || '0'),
      limit: 2,
      remaining: 2 - parseInt(activeJobs[0]?.count || '0')
    },
    monthlyProcessing: {
      used: parseInt(monthlyJobs[0]?.count || '0'),
      // No hard limit, but tracked for monitoring
    }
  })
}))

export default router