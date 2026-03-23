import jwt from '@fastify/jwt'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// Augment Fastify types for @fastify/jwt
declare module 'fastify' {
  interface FastifyRequest {
    jwtVerify(): Promise<void>
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export interface AuthOptions {
  /** JWT secret. Required. */
  secret: string
  /** Token expiry. Defaults to '7d'. */
  expiresIn?: string
}

/**
 * Register JWT auth on a Fastify app.
 * Adds app.jwt.sign/verify and an `authenticate` decorator for protected routes.
 *
 * Usage:
 *   await registerAuth(app, { secret: env.JWT_SECRET })
 *   app.get('/me', { preHandler: [app.authenticate] }, handler)
 */
export async function registerAuth(app: FastifyInstance, options: AuthOptions) {
  await app.register(jwt, {
    secret: options.secret,
    sign: { expiresIn: options.expiresIn ?? '7d' },
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })
}

// ---------------------------------------------------------------------------
// Auth building blocks — use these in your project's auth routes.
// ---------------------------------------------------------------------------

/** Hash a password with bcrypt (10 rounds). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** Verify a password against a bcrypt hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Generate a cryptographically random token (hex string). Default 32 bytes. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

/** Generate a magic link token + expiry. Default 15 minutes. */
export function generateMagicLink(expiresInMs = 15 * 60 * 1000): { token: string; expiresAt: number } {
  return {
    token: generateToken(),
    expiresAt: Date.now() + expiresInMs,
  }
}

/** Verify a magic link token against stored values. Returns true if valid and not expired. */
export function verifyMagicLink(token: string, storedToken: string, expiresAt: number): boolean {
  if (token !== storedToken) return false
  if (Date.now() > expiresAt) return false
  return true
}

/** Generate a stable device ID (random hex). Store on device, send with requests. */
export function generateDeviceId(): string {
  return generateToken(16)
}
