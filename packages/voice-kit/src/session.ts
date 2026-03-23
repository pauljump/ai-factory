/**
 * VoiceSession — manages a real-time voice conversation with OpenAI.
 *
 * Handles WebSocket connection, audio streaming, turn detection,
 * tool calling, and transcript assembly.
 */

import WebSocket from 'ws'
import type { VoiceConfig, VoiceEvents, VoiceTool, RealtimeEvent } from './types.js'

type EventHandler<K extends keyof VoiceEvents> = VoiceEvents[K]

const REALTIME_URL = 'wss://api.openai.com/v1/realtime'
const DEFAULT_MODEL = 'gpt-4o-realtime-preview'

export class VoiceSession {
  private ws: WebSocket | null = null
  private config: Required<Pick<VoiceConfig, 'apiKey' | 'model' | 'voice' | 'inputAudioFormat' | 'outputAudioFormat'>> & VoiceConfig
  private handlers = new Map<string, Function[]>()
  private tools = new Map<string, VoiceTool>()

  constructor(config: VoiceConfig) {
    this.config = {
      model: DEFAULT_MODEL,
      voice: 'alloy',
      inputAudioFormat: 'pcm16',
      outputAudioFormat: 'pcm16',
      turnDetection: 'server_vad',
      ...config,
    }

    for (const tool of config.tools ?? []) {
      this.tools.set(tool.name, tool)
    }
  }

  /** Register an event handler. */
  on<K extends keyof VoiceEvents>(event: K, handler: EventHandler<K>): this {
    const list = this.handlers.get(event) ?? []
    list.push(handler as Function)
    this.handlers.set(event, list)
    return this
  }

  private emit<K extends keyof VoiceEvents>(event: K, ...args: Parameters<VoiceEvents[K]>) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args)
    }
  }

  /** Connect to the OpenAI Realtime API and start the session. */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${REALTIME_URL}?model=${this.config.model}`

      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      })

      this.ws.on('open', () => {
        this.sendSessionUpdate()
        this.emit('connected')
        resolve()
      })

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString()) as RealtimeEvent
          this.handleEvent(event)
        } catch (err) {
          this.emit('error', new Error(`Failed to parse event: ${err}`))
        }
      })

      this.ws.on('error', (err) => {
        this.emit('error', err instanceof Error ? err : new Error(String(err)))
        reject(err)
      })

      this.ws.on('close', (code, reason) => {
        this.emit('disconnected', code, reason.toString())
        this.ws = null
      })
    })
  }

  /** Send audio data to the conversation (base64-encoded PCM16). */
  sendAudio(base64Audio: string) {
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    })
  }

  /** Send a text message (useful for testing without audio). */
  sendText(text: string) {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    })
    this.send({ type: 'response.create' })
  }

  /** Interrupt the agent mid-response. */
  interrupt() {
    this.send({ type: 'response.cancel' })
  }

  /** Disconnect the session. */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /** Check if the session is connected. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private send(event: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(event))
  }

  private sendSessionUpdate() {
    const toolDefs = Array.from(this.tools.values()).map((t) => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))

    this.send({
      type: 'session.update',
      session: {
        voice: this.config.voice,
        instructions: this.config.instructions ?? '',
        input_audio_format: this.config.inputAudioFormat,
        output_audio_format: this.config.outputAudioFormat,
        turn_detection: this.config.turnDetection
          ? { type: this.config.turnDetection }
          : null,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      },
    })
  }

  private handleEvent(event: RealtimeEvent) {
    switch (event.type) {
      case 'response.audio.delta':
        this.emit('audio', event.delta as string)
        break

      case 'response.audio_transcript.done':
        this.emit('transcript', event.transcript as string, 'assistant')
        break

      case 'conversation.item.input_audio_transcription.completed':
        this.emit('transcript', event.transcript as string, 'user')
        break

      case 'response.done':
        this.emit('responseEnd')
        break

      case 'response.function_call_arguments.done':
        this.handleToolCall(event)
        break

      case 'error':
        this.emit('error', new Error(
          (event.error as Record<string, unknown>)?.message as string ?? 'Unknown realtime error'
        ))
        break
    }
  }

  private async handleToolCall(event: RealtimeEvent) {
    const name = event.name as string
    const callId = event.call_id as string
    const tool = this.tools.get(name)

    if (!tool) {
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ error: `Unknown tool: ${name}` }),
        },
      })
      this.send({ type: 'response.create' })
      return
    }

    try {
      const args = JSON.parse(event.arguments as string)
      const result = await tool.handler(args)
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: result,
        },
      })
      this.send({ type: 'response.create' })
    } catch (err) {
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ error: String(err) }),
        },
      })
      this.send({ type: 'response.create' })
    }
  }
}
