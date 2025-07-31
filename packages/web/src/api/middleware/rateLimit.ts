import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// General rate limit for all requests
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

// Stricter rate limit for file uploads
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 upload requests per hour
  message: {
    error: 'Too many upload requests, please try again later.',
    retryAfter: '1 hour'
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health'
  }
})

// Rate limit for AI processing endpoints
export const aiProcessingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 AI requests per hour
  message: {
    error: 'AI processing rate limit exceeded, please try again later.',
    retryAfter: '1 hour'
  }
})