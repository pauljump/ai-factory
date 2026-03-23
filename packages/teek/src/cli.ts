import { createLLMClient } from "@pauljump/llm-kit";
import { createInterface } from "readline";
import { loadEntity, listAll, buildSystemPrompt } from "./engine.js";
import type { EntityKind } from "./types.js";

// --- Parse CLI args ---

function parseArgs(): { kind: EntityKind; name: string; question: string; list: boolean } {
  const args = process.argv.slice(2);
  let kind: EntityKind = "persona";
  let name = "ops-execution";
  let list = false;
  const rest: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--persona" && args[i + 1]) {
      kind = "persona";
      name = args[++i];
    } else if (args[i] === "--role" && args[i + 1]) {
      kind = "role";
      name = args[++i];
    } else if (args[i] === "--agent" && args[i + 1]) {
      kind = "agent";
      name = args[++i];
    } else if (args[i] === "--list") {
      list = true;
    } else {
      rest.push(args[i]);
    }
  }

  return { kind, name, question: rest.join(" "), list };
}

// --- Main ---

const { kind, name, question, list } = parseArgs();

if (list) {
  const all = listAll();
  for (const [k, names] of Object.entries(all)) {
    if (names.length > 0) {
      console.log(`\n${k}s:`);
      names.forEach((n) => console.log(`  - ${n}`));
    }
  }
  if (Object.values(all).every((v) => v.length === 0)) {
    console.log("No entities found.");
  }
  process.exit(0);
}

const entity = loadEntity(kind, name);
const systemPrompt = buildSystemPrompt(entity);

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY or OPENAI_API_KEY");
  process.exit(1);
}

const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai";
const llm = createLLMClient({
  provider,
  apiKey,
  defaultModel: provider === "anthropic" ? "claude-sonnet-4-6" : "gpt-4o",
});

const history: Array<{ role: "user" | "assistant"; content: string }> = [];

// Single question mode
if (question) {
  const result = await llm.chat(
    [{ role: "user", content: question }],
    { system: systemPrompt, maxTokens: 2048 }
  );
  console.log("\n" + result.text + "\n");
  process.exit(0);
}

// Interactive mode
console.log(`┌─────────────────────────────────────┐`);
console.log(`│  ${entity.displayName} (${kind})`.padEnd(38) + `│`);
console.log(`│  Ask anything. Type 'quit' to exit. │`);
console.log(`└─────────────────────────────────────┘\n`);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "You > ",
});

rl.prompt();

rl.on("line", async (line) => {
  const input = line.trim();
  if (!input) { rl.prompt(); return; }
  if (input === "quit" || input === "exit") { rl.close(); return; }

  history.push({ role: "user", content: input });

  try {
    const result = await llm.chat(history, {
      system: systemPrompt,
      maxTokens: 2048,
    });

    history.push({ role: "assistant", content: result.text });
    console.log(`\n${entity.displayName} > ${result.text}\n`);
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("\n");
  process.exit(0);
});
