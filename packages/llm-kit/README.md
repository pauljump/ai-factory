# @pauljump/llm-kit

Provider-agnostic LLM client. OpenAI and Anthropic behind the same interface — swap providers in config, not code. Tool use (function calling) works identically across both.

## Usage

```typescript
import { createLLMClient } from "@pauljump/llm-kit";

const client = createLLMClient({
  provider: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const result = await client.chat([
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "What is the capital of France?" },
]);

console.log(result.content); // "Paris..."
```

### Tool Use

```typescript
const result = await client.chat(messages, {
  tools: [{
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" },
      },
      required: ["location"],
    },
  }],
});

if (result.toolCalls) {
  // result.toolCalls[0] = { id, name: "get_weather", input: { location: "NYC" } }
}
```

### Swap Providers

```typescript
// Same code, different provider
const openai = createLLMClient({ provider: "openai", apiKey: process.env.OPENAI_API_KEY });
const anthropic = createLLMClient({ provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY });

// Both return the same ChatResult shape
```

## Interface

```typescript
interface LLMClient {
  provider: "openai" | "anthropic";
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
}

interface ChatResult {
  content: string;
  toolCalls?: ToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}
```

## Provider Details

- **OpenAI:** Default model `gpt-4o`. Tool calls parsed from `choice.message.tool_calls`.
- **Anthropic:** Default model `claude-sonnet-4-6`. System message passed as top-level param. Tool results batched into single user message per Anthropic spec.

## Stack

openai 4.x, @anthropic-ai/sdk 0.39.x
