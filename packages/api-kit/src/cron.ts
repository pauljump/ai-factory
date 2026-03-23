import type { FastifyBaseLogger } from 'fastify'

export interface CronJob {
  /** Job name (for logging). */
  name: string
  /** Interval in milliseconds. */
  intervalMs: number
  /** The function to run. */
  fn: () => Promise<void> | void
  /** Run immediately on start? Defaults to false. */
  runImmediately?: boolean
  /** Pino logger instance (pass app.log). Falls back to console. */
  logger?: FastifyBaseLogger
}

const timers: Map<string, ReturnType<typeof setInterval>> = new Map()

/**
 * Start a recurring job. Simple in-process scheduler — no Redis, no queues.
 * Good for: price refreshes, cleanup tasks, periodic syncs.
 *
 * Pass `logger: app.log` for structured JSON output in Cloud Logging.
 */
export function startCron(job: CronJob) {
  const log = job.logger

  const run = async () => {
    const start = Date.now()
    try {
      await job.fn()
      const duration = Date.now() - start
      if (log) {
        log.info({ cron: job.name, duration_ms: duration }, `[cron:${job.name}] Completed`)
      }
    } catch (err) {
      const duration = Date.now() - start
      if (log) {
        log.error({ cron: job.name, err, duration_ms: duration }, `[cron:${job.name}] Error`)
      } else {
        console.error(`[cron:${job.name}] Error:`, err)
      }
    }
  }

  if (job.runImmediately) run()

  const timer = setInterval(run, job.intervalMs)
  timers.set(job.name, timer)
  if (log) {
    log.info({ cron: job.name, interval_s: Math.round(job.intervalMs / 1000) }, `[cron:${job.name}] Started`)
  } else {
    console.log(`[cron:${job.name}] Started (every ${Math.round(job.intervalMs / 1000)}s)`)
  }
}

/** Stop a specific cron job by name. */
export function stopCron(name: string) {
  const timer = timers.get(name)
  if (timer) {
    clearInterval(timer)
    timers.delete(name)
  }
}

/** Stop all cron jobs. Call on shutdown. */
export function stopAllCrons() {
  for (const [, timer] of timers) {
    clearInterval(timer)
  }
  timers.clear()
}
