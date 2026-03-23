# Observability Playbook

What every api-kit app gets for free, how to use it, and how to read your logs.

## What api-kit Provides Automatically

Every app that calls `createApp()` gets these without any extra code:

### 1. Request Logging (Pino / structured JSON)
Fastify logs every request with method, URL, status code, and latency. In production (Cloud Run), these are structured JSON that Cloud Logging indexes automatically.

### 2. Global Error Handler
When any route throws, api-kit:
- Logs the full error with stack trace, method, URL, and user_id
- Returns a clean error to the client (no stack traces leaked)
- Uses the error's statusCode if present, otherwise 500

### 3. Process Crash Handlers
`unhandledRejection` and `uncaughtException` are caught, logged as `fatal`, and the process exits cleanly. Cloud Run restarts the container. Without these, crashes are silent.

### 4. Authenticated Request Attribution
After JWT verification, the `onResponse` hook logs `user_id` and `response_time` for every authenticated request. This tells you WHO did WHAT and HOW LONG it took.

### 5. Cron Job Logging
Pass `logger: app.log` to `startCron()` for structured cron logs:
```ts
startCron({
  name: 'scrape-listings',
  intervalMs: 60 * 60 * 1000,
  fn: async () => { /* ... */ },
  logger: app.log,  // <-- structured JSON instead of console.log
})
```
Each run logs: job name, duration_ms, success/error with stack trace.

## What You Add Per-App

### Domain-Specific Logging
Use `app.log` or `request.log` in route handlers for important business events:

```ts
app.log.info({ story_id: id, user_id: userId, cost: STORY_COST }, 'Story compiled')
app.log.warn({ user_id: userId }, 'Insufficient points for story')
```

Keep it to events you'd actually search for when debugging. Don't log everything.

### Error Context in Catch Blocks
When catching errors in routes, include context:

```ts
try {
  const result = await externalApi.call(params)
} catch (err) {
  request.log.error({ err, params }, 'External API call failed')
  return reply.status(502).send({ error: 'Upstream service error' })
}
```

## How to Read Logs

### Cloud Run (production)
```bash
# Last 100 log entries
gcloud run logs read <service-name> --region us-east1 --limit 100

# Errors only
gcloud run logs read <service-name> --region us-east1 --limit 50 --log-filter="severity>=ERROR"

# Specific user
gcloud run logs read <service-name> --region us-east1 --log-filter='jsonPayload.user_id="user-123"'

# Cron job results
gcloud run logs read <service-name> --region us-east1 --log-filter='jsonPayload.cron="scrape-listings"'
```

### Cloud Logging Console
Go to `console.cloud.google.com/logs` and filter by:
- **Resource type:** Cloud Run Revision
- **Service name:** your service
- **Severity:** ERROR / WARNING / etc.
- **jsonPayload.user_id:** specific user
- **jsonPayload.cron:** specific job

### Local Development
Pino outputs pretty-printed logs in dev. Just read the terminal.

## What We Don't Build (and why)

| Thing | Why Not |
|-------|---------|
| Sentry / Datadog | Cloud Logging is free and sufficient at our scale |
| Correlation IDs | Solo dev, <100 users — timestamp is enough to trace |
| Request body logging | Security risk (passwords, tokens) |
| Business analytics tables | Premature — build when we know what to track |
| Custom alerting endpoints | Use GCP alert policies (zero code) |
| Slow query logging | SQLite on local disk is fast enough |

Revisit when any app crosses ~1K daily active users.

## GCP Alert Policies (Optional, Zero Code)

Set up in the GCP Console under Monitoring > Alerting:
- **Error rate > 5%** over 5 minutes → email notification
- **Instance count = 0** for > 10 minutes → service down
- **Memory utilization > 80%** → approaching OOM

These are built into Cloud Run — no code changes needed.

## Checklist for New Apps

- [ ] Uses `createApp()` from api-kit (gets everything above for free)
- [ ] Cron jobs pass `logger: app.log`
- [ ] Route error catches include context (`request.log.error({ err, context }, 'message')`)
- [ ] External API calls have try/catch with logging
- [ ] No `console.log` in production code — use `app.log` or `request.log`
