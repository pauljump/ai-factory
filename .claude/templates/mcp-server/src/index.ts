#!/usr/bin/env node

/**
 * __PROJECT__ MCP Server
 *
 * Exposes __PROJECT__ data and actions to AI agents via the
 * Model Context Protocol. Any MCP-compatible client (Claude Desktop,
 * ChatGPT, Cursor, etc.) can query this server.
 *
 * Usage:
 *   pnpm dev          # run with tsx (development)
 *   pnpm build && node dist/index.js  # compiled
 *
 * Register in Claude Desktop → Settings → Developer → MCP Servers:
 *   {
 *     "__PROJECT__": {
 *       "command": "node",
 *       "args": ["/path/to/__PROJECT__/mcp/dist/index.js"]
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function main() {
  const server = new McpServer({
    name: "__PROJECT__",
    version: "0.1.0",
  });

  // ---------------------------------------------------------------------------
  // Tools — actions the agent can take
  // ---------------------------------------------------------------------------

  // Example: query your project's data
  server.tool(
    "search",
    "Search __PROJECT__ data. Returns matching results.",
    {
      query: z.string().describe("Search query"),
      limit: z.number().optional().default(10).describe("Max results to return"),
    },
    async ({ query, limit }) => {
      // TODO: Replace with your actual data query
      // e.g. const results = db.prepare('SELECT * FROM items WHERE name LIKE ?').all(`%${query}%`)
      const results = [
        { id: 1, name: `Example result for "${query}"` },
      ];

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ results: results.slice(0, limit), total: results.length }, null, 2),
        }],
      };
    },
  );

  // Example: take an action
  server.tool(
    "create_item",
    "Create a new item in __PROJECT__.",
    {
      name: z.string().describe("Item name"),
      description: z.string().optional().describe("Item description"),
    },
    async ({ name, description }) => {
      // TODO: Replace with your actual create logic
      // e.g. const result = db.prepare('INSERT INTO items (name, description) VALUES (?, ?)').run(name, description)
      const id = Date.now();

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ created: { id, name, description } }, null, 2),
        }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // Resources — data the agent can read as context
  // ---------------------------------------------------------------------------

  // Example: expose current status
  server.resource(
    "status",
    "status://current",
    { description: "Current __PROJECT__ status and stats" },
    async () => {
      // TODO: Replace with your actual status data
      const status = {
        service: "__PROJECT__",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };

      return {
        contents: [{
          uri: "status://current",
          mimeType: "application/json",
          text: JSON.stringify(status, null, 2),
        }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // Connect via stdio transport
  // ---------------------------------------------------------------------------

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[__PROJECT__] MCP server running`);
}

main().catch((err) => {
  console.error("[__PROJECT__] Fatal error:", err);
  process.exit(1);
});
