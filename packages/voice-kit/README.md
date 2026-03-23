# @pauljump/voice-kit

Real-time voice conversations via OpenAI's Realtime API. Two modes:

1. **VoiceSession** — server-side Node.js WebSocket client (for bots, agents, phone integrations)
2. **VoiceRelay** — WebSocket relay server so browsers can talk to OpenAI (browser can't auth directly)

## Cost

~$0.04/minute of speech-to-speech with server VAD. Not free — use for high-value interactions, not casual browsing.

## Server-side Usage (VoiceSession)

```typescript
import { VoiceSession } from '@pauljump/voice-kit'

const session = new VoiceSession({
  apiKey: process.env.OPENAI_API_KEY!,
  voice: 'coral',
  instructions: 'You are a helpful apartment finder for StuyWatch.',
  tools: [{
    name: 'search_listings',
    description: 'Search available apartments',
    parameters: { type: 'object', properties: { bedrooms: { type: 'number' } } },
    handler: async (args) => JSON.stringify(await searchListings(args)),
  }],
})

session.on('transcript', (text, role) => console.log(`${role}: ${text}`))
session.on('audio', (base64) => { /* send to speaker / phone */ })

await session.connect()
session.sendText('Find me a 2 bedroom under $4000')  // or sendAudio(base64pcm)
```

## Browser Relay Usage

```typescript
// Server (Fastify)
import { createVoiceRelay } from '@pauljump/voice-kit'

const relay = createVoiceRelay({
  apiKey: env.OPENAI_API_KEY,
  path: '/voice',
  instructions: 'You are a helpful assistant.',
})

relay.attach(app.server)

// Browser
const ws = new WebSocket('wss://your-api.com/voice')
// Send audio from mic as OpenAI Realtime events
// Receive audio events and play through speakers
```

## API

### VoiceSession

| Method | Description |
|--------|-------------|
| `connect()` | Open WebSocket to OpenAI |
| `sendAudio(base64)` | Stream mic audio (base64 PCM16) |
| `sendText(text)` | Send text message (no mic needed) |
| `interrupt()` | Stop agent mid-response |
| `disconnect()` | Close the session |

### Events

| Event | Payload | When |
|-------|---------|------|
| `connected` | — | WebSocket opens |
| `audio` | `base64: string` | Agent audio chunk |
| `transcript` | `text, role` | Speech-to-text result |
| `responseEnd` | — | Agent finished speaking |
| `error` | `Error` | Something broke |
| `disconnected` | `code, reason` | WebSocket closed |

### createVoiceRelay(config)

Attach to any HTTP server. Relays audio between browser WebSocket and OpenAI. Handles tool calls server-side (keeps API key safe).
