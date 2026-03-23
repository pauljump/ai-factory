/**
 * Streaming chat API route using Vercel AI SDK.
 *
 * Handles POST requests with a messages array, streams the response back.
 * Works with the useChat() hook on the client side.
 *
 * Install:
 *   pnpm add ai @ai-sdk/anthropic zod
 *
 * Structured output example included — uncomment to use.
 */

import { streamText } from "ai"
import { defaultModel } from "@/lib/ai"

// --- Structured output example (uncomment to use) ---
// import { z } from "zod"
//
// const recipeSchema = z.object({
//   name: z.string().describe("Recipe name"),
//   ingredients: z.array(z.object({
//     item: z.string(),
//     amount: z.string(),
//   })).describe("List of ingredients"),
//   steps: z.array(z.string()).describe("Step-by-step instructions"),
//   estimatedMinutes: z.number().describe("Total cook time in minutes"),
// })

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: defaultModel,
    system: "You are a helpful assistant.", // Customize per app
    messages,
    // --- Structured output (uncomment to use) ---
    // To get structured JSON output instead of freeform text:
    //
    // import { streamObject } from "ai"
    //
    // const result = streamObject({
    //   model: defaultModel,
    //   schema: recipeSchema,
    //   prompt: messages[messages.length - 1].content,
    // })
    //
    // return result.toTextStreamResponse()
  })

  return result.toDataStreamResponse()
}
