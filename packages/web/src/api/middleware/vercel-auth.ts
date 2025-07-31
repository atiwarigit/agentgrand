import { VercelRequest } from '@vercel/node'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { queryOne } from '../database/vercel-connection'

const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID || '',
})

export interface AuthenticatedUser {
  id: string
  email: string
  cognitoSub: string
  roles: string[]
}

export async function authMiddleware(req: VercelRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = req.headers.authorization as string
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    
    // For development/testing, allow bypass with test token
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      return {
        id: 'test-user-id',
        email: 'test@example.com',
        cognitoSub: 'test-cognito-sub',
        roles: ['user']
      }
    }

    // Verify JWT token with Cognito
    const payload = await jwtVerifier.verify(token)
    
    // Get user from database
    let user = await queryOne(
      'SELECT * FROM users WHERE cognito_sub = $1',
      [payload.sub]
    )

    if (!user) {
      // Create user if doesn't exist (first time login)
      const newUserResult = await queryOne(`
        INSERT INTO users (email, name, cognito_sub, roles, last_login)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `, [
        payload.email || payload.username,
        payload.name || payload.email || payload.username,
        payload.sub,
        ['user']
      ])
      
      user = newUserResult
    } else {
      // Update last login
      await queryOne(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      )
    }

    return {
      id: user.id,
      email: user.email,
      cognitoSub: user.cognito_sub,
      roles: user.roles
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}