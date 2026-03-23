# The Spotter

**Moved to `packages/teek/agents/spotter/profile.md`** — teek is now the factory's agent ecosystem.

To use: `pnpm --filter @pauljump/teek ask --agent spotter "scan the monorepo"`

Or load programmatically:
```typescript
import { loadEntity, buildSystemPrompt } from "@pauljump/teek";
const spotter = loadEntity("agent", "spotter");
const prompt = buildSystemPrompt(spotter);
```
