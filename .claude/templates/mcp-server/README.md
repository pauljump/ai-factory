# MCP Server Template

Turn any project into a data source that AI agents can query.

## What is MCP?

Model Context Protocol (MCP) is the standard for connecting AI agents to tools and data. When your project has an MCP server, Claude Desktop, ChatGPT, Cursor, and other AI clients can search your data, trigger actions, and use your project as context — without you building a custom integration for each one.

## Quick Start

1. **Copy this template** into your project:
   ```bash
   cp -r .claude/templates/mcp-server/ <project>/mcp/
   ```

2. **Find-replace `__PROJECT__`** with your project name (e.g. `myapp`)

3. **Install dependencies:**
   ```bash
   cd <project>/mcp && pnpm install
   ```

4. **Add your tools and resources** in `src/index.ts`:
   - **Tools** = actions (search, create, update, delete)
   - **Resources** = data the agent can read as context

5. **Register with Claude Desktop:**
   Go to Settings → Developer → Edit Config, add:
   ```json
   {
     "mcpServers": {
       "your-project": {
         "command": "node",
         "args": ["/absolute/path/to/project/mcp/dist/index.js"]
       }
     }
   }
   ```

6. **Test it:** Open Claude Desktop and ask about your project's data.

## Adding Tools

Tools are actions the agent can take. Define them with a name, description, Zod schema for inputs, and a handler:

```typescript
server.tool(
  "get_listings",
  "Get active apartment listings with optional filters",
  {
    bedrooms: z.number().optional(),
    maxPrice: z.number().optional(),
  },
  async ({ bedrooms, maxPrice }) => {
    const listings = db.prepare('SELECT * FROM listings WHERE ...').all();
    return {
      content: [{ type: "text", text: JSON.stringify(listings, null, 2) }],
    };
  },
);
```

## Adding Resources

Resources expose data the agent can read as context (like a file it can reference):

```typescript
server.resource(
  "market-summary",
  "market://summary",
  { description: "Current market stats" },
  async () => ({
    contents: [{
      uri: "market://summary",
      mimeType: "application/json",
      text: JSON.stringify(getMarketStats(), null, 2),
    }],
  }),
);
```

## Development

```bash
pnpm dev     # run with tsx (hot reload)
pnpm build   # compile TypeScript
```
