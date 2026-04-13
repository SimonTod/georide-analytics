import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import jwt from 'jsonwebtoken'

export type JwtPayload = {
  sub: number
  georide_user_id: number
}

export type AppVariables = {
  jwtPayload: JwtPayload
}

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.slice(7)
    const secret = process.env.JWT_SECRET
    if (!secret) throw new HTTPException(500, { message: 'JWT_SECRET not configured' })

    try {
      const payload = jwt.verify(token, secret) as unknown as JwtPayload
      c.set('jwtPayload', payload)
    } catch {
      throw new HTTPException(401, { message: 'Invalid or expired token' })
    }

    await next()
  }
)
