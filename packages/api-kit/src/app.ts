import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

export interface AppOptions {
  /** App name — used in logs and health check */
  name: string
  /** Port to listen on. Defaults to PORT env var or 3000. */
  port?: number
  /** Host to bind to. Defaults to '0.0.0.0'. */
  host?: string
  /** Rate limit: max requests per minute per IP. Defaults to 60. */
  rateLimit?: number
  /** Disable helmet (e.g. for development). Defaults to false. */
  noHelmet?: boolean
  /** Logger options. Defaults to true. */
  logger?: boolean
}

const startedAt = Date.now()

/**
 * Create a Fastify app with sensible defaults:
 * - CORS (open)
 * - Helmet (security headers)
 * - Rate limiting (per-IP, 60/min default)
 * - Health check at GET /health
 * - Request logging with user attribution
 * - Global error handler with request context
 * - Process crash handlers (unhandledRejection, uncaughtException)
 */
export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  const port = options.port ?? parseInt(process.env.PORT ?? '3000', 10)
  const host = options.host ?? '0.0.0.0'

  const app = Fastify({
    logger: options.logger ?? true,
    trustProxy: true,
  })

  // Security
  await app.register(cors, { origin: true })
  if (!options.noHelmet) {
    await app.register(helmet)
  }

  // Rate limiting
  await app.register(rateLimit, {
    max: options.rateLimit ?? 60,
    timeWindow: '1 minute',
  })

  // --- Observability ---

  // Global error handler: log error with request context, return clean 500
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    const user = (request as any).user as { sub?: string } | undefined
    app.log.error({
      err: error,
      method: request.method,
      url: request.url,
      user_id: user?.sub ?? 'anonymous',
    }, `[${options.name}] Request error`)

    const statusCode = error.statusCode ?? 500
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal server error' : error.message,
    })
  })

  // Enrich response logs with user_id
  app.addHook('onResponse', (request, reply, done) => {
    const user = (request as any).user as { sub?: string } | undefined
    if (user?.sub) {
      request.log.info({
        user_id: user.sub,
        response_time: reply.elapsedTime,
      }, 'authenticated request')
    }
    done()
  })

  // Process crash handlers — log before dying so Cloud Logging captures it
  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ err: reason }, `[${options.name}] Unhandled promise rejection — exiting`)
    process.exit(1)
  })

  process.on('uncaughtException', (error) => {
    app.log.fatal({ err: error }, `[${options.name}] Uncaught exception — exiting`)
    process.exit(1)
  })

  // Health check
  app.get('/health', async () => {
    const uptimeMs = Date.now() - startedAt
    return {
      status: 'ok',
      name: options.name,
      uptime_seconds: Math.round(uptimeMs / 1000),
    }
  })

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info(`[${options.name}] Shutting down...`)
    await app.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // Attach start method
  const originalListen = app.listen.bind(app)
  app.listen = (async (opts?: any) => {
    const listenOpts = opts ?? { port, host }
    const address = await originalListen(listenOpts)
    app.log.info(`[${options.name}] Listening on ${address}`)
    return address
  }) as typeof app.listen

  return app
}
