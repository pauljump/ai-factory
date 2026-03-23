"use client"

/**
 * Streaming chat component using Vercel AI SDK's useChat() hook.
 *
 * Drop this into any page:
 *   import { Chat } from "@/components/ui/chat"
 *   export default function Page() { return <Chat /> }
 *
 * Requires the API route at app/api/chat/route.ts.
 *
 * Install:
 *   pnpm add ai @ai-sdk/anthropic
 */

import { useChat } from "@ai-sdk/react"
import { cn } from "@/lib/utils"

export function Chat({ className }: { className?: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat()

  return (
    <div
      className={cn(
        "mx-auto flex h-[600px] w-full max-w-2xl flex-col rounded-lg border border-border bg-card",
        className
      )}
    >
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Send a message to start the conversation.
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary px-4 py-2 text-sm text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message || "Something went wrong. Please try again."}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border p-4"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
