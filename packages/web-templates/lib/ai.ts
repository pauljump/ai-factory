/**
 * AI provider configuration for streaming chat.
 *
 * Uses Vercel AI SDK with Anthropic by default.
 * To swap providers, change the import and createX call below.
 *
 * Install:
 *   pnpm add ai @ai-sdk/anthropic
 *
 * Env var required:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * To use OpenAI instead:
 *   pnpm add @ai-sdk/openai
 *   import { createOpenAI } from "@ai-sdk/openai"
 *   export const ai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })
 *   export const defaultModel = ai("gpt-4o")
 */

import { createAnthropic } from "@ai-sdk/anthropic"

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/** Default model used by the chat route. Change to any Anthropic model ID. */
export const defaultModel = anthropic("claude-sonnet-4-20250514")
