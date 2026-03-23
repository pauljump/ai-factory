/** Configuration for creating a voice session. */
export interface VoiceConfig {
  /** OpenAI API key. */
  apiKey: string
  /** Model to use. Defaults to 'gpt-4o-realtime-preview'. */
  model?: string
  /** Voice preset. Defaults to 'alloy'. */
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse'
  /** System instructions for the voice agent. */
  instructions?: string
  /** Input audio format. Defaults to 'pcm16'. */
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'
  /** Output audio format. Defaults to 'pcm16'. */
  outputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw'
  /** Turn detection mode. Defaults to 'server_vad'. */
  turnDetection?: 'server_vad' | null
  /** Tool definitions the voice agent can call. */
  tools?: VoiceTool[]
}

/** A tool the voice agent can call during conversation. */
export interface VoiceTool {
  /** Tool name. */
  name: string
  /** Description of what the tool does. */
  description: string
  /** JSON Schema for the tool parameters. */
  parameters: Record<string, unknown>
  /** Handler called when the agent invokes this tool. */
  handler: (args: Record<string, unknown>) => Promise<string>
}

/** Events emitted by the voice session. */
export interface VoiceEvents {
  /** Connection established. */
  connected: () => void
  /** Audio data received from the agent (PCM16 base64). */
  audio: (data: string) => void
  /** Transcript of what the agent said. */
  transcript: (text: string, role: 'assistant' | 'user') => void
  /** Agent finished speaking a response. */
  responseEnd: () => void
  /** Error occurred. */
  error: (error: Error) => void
  /** Connection closed. */
  disconnected: (code: number, reason: string) => void
}

/** A server event from the OpenAI Realtime API. */
export interface RealtimeEvent {
  type: string
  [key: string]: unknown
}
