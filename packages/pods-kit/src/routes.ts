import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { PodsEngine } from './engine.js'
import { messageBodySchema, exitReasonSchema, dmMessageBodySchema } from './types.js'

/**
 * Register pod routes on a Fastify app.
 * Assumes auth is already set up (via api-kit registerAuth).
 */
export function registerPodRoutes(app: FastifyInstance, engine: PodsEngine) {
  const auth = (app as any).authenticate
  const getUserId = (request: FastifyRequest) => (request as any).user.sub as string

  // Get unlock status
  app.get('/pods/status', { preHandler: [auth] }, async (request) => {
    return engine.getUnlockStatus(getUserId(request))
  })

  // Join match queue (triggers matching attempt)
  app.post('/pods/join-queue', { preHandler: [auth] }, async (request) => {
    return engine.joinQueue(getUserId(request))
  })

  // List my pods
  app.get('/pods', { preHandler: [auth] }, async (request) => {
    return { pods: engine.getUserPods(getUserId(request)) }
  })

  // Get single pod
  app.get('/pods/:podId', { preHandler: [auth] }, async (request, reply) => {
    const { podId } = request.params as { podId: string }
    const pod = engine.getPod(podId, getUserId(request))
    if (!pod) return reply.status(404).send({ error: 'Pod not found' })
    return { pod }
  })

  // Get pod messages
  app.get('/pods/:podId/messages', { preHandler: [auth] }, async (request, reply) => {
    const { podId } = request.params as { podId: string }
    const query = z.object({ page: z.coerce.number().int().min(1).default(1) }).parse(request.query)
    const userId = getUserId(request)

    // Verify membership
    const pod = engine.getPod(podId, userId)
    if (!pod) return reply.status(404).send({ error: 'Pod not found' })

    return engine.getMessages(podId, userId, query.page)
  })

  // Send message to pod
  app.post('/pods/:podId/messages', { preHandler: [auth] }, async (request, reply) => {
    const { podId } = request.params as { podId: string }
    const userId = getUserId(request)
    const body = messageBodySchema.parse(request.body)

    // Verify membership
    const pod = engine.getPod(podId, userId)
    if (!pod) return reply.status(404).send({ error: 'Pod not found' })

    const message = engine.sendMessage(podId, userId, body.content, body.message_type, body.metadata)
    return { message }
  })

  // Toggle reaction on a message
  app.post('/pods/messages/:messageId/react', { preHandler: [auth] }, async (request) => {
    const { messageId } = request.params as { messageId: string }
    const added = engine.toggleReaction(messageId, getUserId(request))
    return { reacted: added }
  })

  // Leave a pod
  app.post('/pods/:podId/leave', { preHandler: [auth] }, async (request, reply) => {
    const { podId } = request.params as { podId: string }
    const body = exitReasonSchema.parse(request.body)
    const success = engine.leavePod(podId, getUserId(request), body.reason)
    if (!success) return reply.status(404).send({ error: 'Pod not found' })
    return { left: true }
  })

  // --- Direct Messages ---

  // Start or get a DM thread with another user (must share a pod)
  app.post('/dms/start', { preHandler: [auth] }, async (request, reply) => {
    const { other_user_id } = z.object({ other_user_id: z.string() }).parse(request.body)
    const thread = engine.getOrCreateDmThread(getUserId(request), other_user_id)
    if (!thread) return reply.status(403).send({ error: 'You must share a pod to DM this person' })
    return { thread }
  })

  // List all DM threads
  app.get('/dms', { preHandler: [auth] }, async (request) => {
    return { threads: engine.listDmThreads(getUserId(request)) }
  })

  // Get messages in a DM thread
  app.get('/dms/:threadId/messages', { preHandler: [auth] }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string }
    const query = z.object({ page: z.coerce.number().int().min(1).default(1) }).parse(request.query)
    const result = engine.getDmMessages(threadId, getUserId(request), query.page)
    if (!result) return reply.status(404).send({ error: 'Thread not found' })
    return result
  })

  // Send a DM
  app.post('/dms/:threadId/messages', { preHandler: [auth] }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string }
    const body = dmMessageBodySchema.parse(request.body)
    const message = engine.sendDm(threadId, getUserId(request), body.content)
    if (!message) return reply.status(404).send({ error: 'Thread not found' })
    return { message }
  })
}
