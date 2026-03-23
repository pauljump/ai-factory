/**
 * VoiceRelay — WebSocket relay server for browser-to-OpenAI voice.
 *
 * Browsers can't connect directly to OpenAI's Realtime API (no auth headers
 * on browser WebSockets). This relay sits between the browser and OpenAI:
 *
 *   Browser (mic audio) → Your Server (relay) → OpenAI Realtime API
 *   Browser (speaker)   ← Your Server (relay) ← OpenAI Realtime API
 *
 * Usage with Fastify:
 *   import { createVoiceRelay } from '@pauljump/voice-kit'
 *
 *   const relay = createVoiceRelay({
 *     apiKey: env.OPENAI_API_KEY,
 *     path: '/voice',
 *     instructions: 'You are a helpful apartment finder...',
 *   })
 *
 *   relay.attach(app.server)  // attach to Fastify's HTTP server
 */

import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { VoiceConfig } from './types.js'

const REALTIME_URL = 'wss://api.openai.com/v1/realtime'

export interface RelayConfig extends VoiceConfig {
  /** WebSocket path to listen on. Defaults to '/voice'. */
  path?: string
}

export interface VoiceRelay {
  /** Attach to an HTTP server (e.g. Fastify's app.server). */
  attach(server: Server): void
  /** Number of active voice sessions. */
  readonly activeSessions: number
}

export function createVoiceRelay(config: RelayConfig): VoiceRelay {
  const path = config.path ?? '/voice'
  const model = config.model ?? 'gpt-4o-realtime-preview'
  let sessionCount = 0

  let wss: WebSocketServer | null = null

  return {
    attach(server: Server) {
      wss = new WebSocketServer({ server, path })

      wss.on('connection', (clientWs) => {
        sessionCount++
        console.log(`[voice-relay] Client connected (${sessionCount} active)`)

        // Open connection to OpenAI
        const openaiWs = new WebSocket(
          `${REALTIME_URL}?model=${model}`,
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'OpenAI-Beta': 'realtime=v1',
            },
          },
        )

        openaiWs.on('open', () => {
          // Send session config
          const toolDefs = (config.tools ?? []).map((t) => ({
            type: 'function',
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          }))

          openaiWs.send(JSON.stringify({
            type: 'session.update',
            session: {
              voice: config.voice ?? 'alloy',
              instructions: config.instructions ?? '',
              input_audio_format: config.inputAudioFormat ?? 'pcm16',
              output_audio_format: config.outputAudioFormat ?? 'pcm16',
              turn_detection: config.turnDetection !== null
                ? { type: config.turnDetection ?? 'server_vad' }
                : null,
              tools: toolDefs.length > 0 ? toolDefs : undefined,
            },
          }))
        })

        // Relay: client → OpenAI
        clientWs.on('message', (data) => {
          if (openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(data)
          }
        })

        // Relay: OpenAI → client
        openaiWs.on('message', (data) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data)
          }
        })

        // Handle tool calls server-side
        openaiWs.on('message', async (data) => {
          try {
            const event = JSON.parse(data.toString())
            if (event.type === 'response.function_call_arguments.done') {
              const tool = (config.tools ?? []).find((t) => t.name === event.name)
              if (tool) {
                const args = JSON.parse(event.arguments)
                const result = await tool.handler(args)
                openaiWs.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: result,
                  },
                }))
                openaiWs.send(JSON.stringify({ type: 'response.create' }))
              }
            }
          } catch {
            // Not a tool call event — ignore
          }
        })

        // Cleanup on disconnect
        const cleanup = () => {
          sessionCount--
          console.log(`[voice-relay] Client disconnected (${sessionCount} active)`)
          if (openaiWs.readyState === WebSocket.OPEN) openaiWs.close()
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close()
        }

        clientWs.on('close', cleanup)
        openaiWs.on('close', () => {
          if (clientWs.readyState === WebSocket.OPEN) clientWs.close()
        })
        openaiWs.on('error', (err) => {
          console.error('[voice-relay] OpenAI error:', err.message)
          cleanup()
        })
      })
    },

    get activeSessions() {
      return sessionCount
    },
  }
}
