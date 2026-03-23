import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { EntityKind, TeekEntity } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Directory for each entity kind */
const kindDirs: Record<EntityKind, string> = {
  persona: join(root, "personas"),
  role: join(root, "roles"),
  agent: join(root, "agents"),
};

/** Load all markdown files from a directory, concatenated */
function loadDir(dir: string): string {
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readFileSync(join(dir, f), "utf-8"))
    .join("\n\n---\n\n");
}

/** List all available entities of a given kind */
export function listEntities(kind: EntityKind): string[] {
  const dir = kindDirs[kind];
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** List all entities across all kinds */
export function listAll(): Record<EntityKind, string[]> {
  return {
    persona: listEntities("persona"),
    role: listEntities("role"),
    agent: listEntities("agent"),
  };
}

/** Load an entity by kind and name */
export function loadEntity(kind: EntityKind, name: string): TeekEntity {
  const dir = kindDirs[kind];
  const entityDir = join(dir, name);

  if (!existsSync(entityDir)) {
    const available = listEntities(kind);
    throw new Error(
      `${kind} "${name}" not found. Available: ${available.join(", ") || "(none)"}`
    );
  }

  const profilePath = join(entityDir, "profile.md");
  if (!existsSync(profilePath)) {
    throw new Error(`${kind} "${name}" has no profile.md`);
  }

  const profile = readFileSync(profilePath, "utf-8");
  const context = loadDir(join(entityDir, "context"));

  // Extract display name from first heading
  const heading = profile.match(/^#\s+(.+?)(?:\s*—.*)?$/m);
  const displayName = heading ? heading[1].trim() : name;

  return { kind, name, displayName, profile, context };
}

/** Build the system prompt for an entity */
export function buildSystemPrompt(entity: TeekEntity): string {
  const kindLabel: Record<EntityKind, string> = {
    persona: "COGNITIVE PROFILE",
    role: "ROLE DEFINITION",
    agent: "AGENT DEFINITION",
  };

  const kindInstruction: Record<EntityKind, string> = {
    persona: `You are a simulator of the person described below. Respond AS this person would — matching their thinking patterns, values, communication style, and decision-making framework.

Rules:
- Respond in first person as ${entity.displayName}
- Match their documented voice, tone, and energy
- Draw on their documented values, decision architecture, and cognitive biases
- Weight the "Operating" version over the "Manifesto" version — be pragmatic, not idealistic
- When uncertain, say what's most consistent with the documented patterns
- If asked about something outside the profile, reason from their known worldview — don't make up facts
- Be blunt if they're blunt. Be measured if they're measured. Match the person.
- Use their actual phrases where natural`,

    role: `You are operating in the role described below. Think, analyze, and respond from this professional perspective — with the expertise, priorities, and judgment this role demands.

Rules:
- Bring the depth of experience this role implies
- Prioritize what this role would prioritize
- Flag concerns this role would flag
- Be direct and opinionated — a good ${entity.displayName} has strong views
- If asked something outside this role's expertise, say so`,

    agent: `You are an autonomous agent with a specific mission described below. Execute your mission proactively — scan, analyze, and report without being asked.

Rules:
- Follow your trigger conditions and scope
- Produce outputs in the format defined in your profile
- Be specific — name files, line numbers, projects
- If you find nothing worth reporting, say so. Don't invent findings.
- Act, don't advise`,
  };

  let prompt = kindInstruction[entity.kind];
  prompt += `\n\n${kindLabel[entity.kind]}:\n${entity.profile}`;

  if (entity.context) {
    prompt += `\n\nCONTEXT:\n${entity.context}`;
  }

  return prompt;
}
