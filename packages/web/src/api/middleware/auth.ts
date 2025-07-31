import { Request, Response, NextFunction } from 'express'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { database } from '../database/connection'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    cognitoSub: string
    roles: string[]
  }
}

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID || '',
})

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' })
      return
    }

    const token = authHeader.substring(7)
    
    // Verify JWT token with Cognito
    const payload = await jwtVerifier.verify(token)
    
    // Get user from database
    const user = await database.queryOne(
      'SELECT * FROM users WHERE cognito_sub = $1',
      [payload.sub]
    )

    if (!user) {
      // Create user if doesn't exist (first time login)
      const newUser = await database.insert('users', {
        email: payload.email || payload.username,
        name: payload.name || payload.email || payload.username,
        cognito_sub: payload.sub,
        roles: ['user'],
        last_login: new Date()
      })
      
      ;(req as AuthenticatedRequest).user = {
        id: newUser.id,
        email: newUser.email,
        cognitoSub: newUser.cognito_sub,
        roles: newUser.roles
      }
    } else {
      // Update last login
      await database.update('users', user.id, {
        last_login: new Date()
      })
      
      ;(req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        cognitoSub: user.cognito_sub,
        roles: user.roles
      }
    }

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}