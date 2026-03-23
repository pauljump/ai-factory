# Playbook: LLM API Key Management

Learned from: Orchard (2026-03-11)

## Principle

One API key per app, per provider, per environment. Never share keys across apps. The cost visibility and kill-switch isolation is worth the 2 minutes of setup.

## Structure

```
OpenAI org
├── testing/          ← dev keys for all apps (shared project is fine for dev)
├── orchard-prod/     ← production key for Orchard
├── wad-prod/         ← production key for WAD
└── <app>-prod/       ← one per deployed app
```

Same pattern for Anthropic, Google, etc. when those providers are added.

## Per-App Setup

1. **Create a project** in the provider's dashboard (OpenAI → Settings → Projects)
2. **Generate a key** scoped to that project
3. **Set a spend cap** — even a generous one catches runaway loops
4. **Store the key** as an env var:
   - Local dev: pass directly or use `.env` (never committed)
   - Cloud Run: `gcloud secrets create <app>-openai-key --data-file=-`
   - See `cloud-run-deploy.md` for secrets mounting

## Env Vars (standard across all apps using @pauljump/llm-kit)

```bash
LLM_PROVIDER=openai          # or "anthropic"
OPENAI_API_KEY=sk-...         # when provider is openai
ANTHROPIC_API_KEY=sk-ant-...  # when provider is anthropic
```

`@pauljump/llm-kit` reads these automatically. The app's `server.ts` validates them via env schema.

## Key Resolution (future: user-provided keys)

When users bring their own keys, the resolution order will be:
1. User's key (stored encrypted per-owner in the app's DB)
2. Platform key (our key, metered for trial usage)
3. Error — no key available

This is app-level logic, not llm-kit's job. llm-kit just takes a key and uses it.

## Dev Workflow

- Use the "testing" project key for local dev across all apps
- Never hardcode keys — always env vars
- The API won't start LLM features without a key, but the server still runs (health check works, auth works, etc.)

## Cost Monitoring

- Check provider dashboards weekly during active development
- Set billing alerts at $10/day per app (adjust as usage patterns emerge)
- The spawn conversation is the most expensive moment (GPT-4o / Sonnet, multi-turn). Network chat uses the cheap model (GPT-4o-mini / Haiku).

## Gotchas

- OpenAI keys are scoped to projects — a key from project A won't show costs under project B
- Anthropic workspaces work similarly — one workspace per app
- Rate limits are per-key, not per-org. A shared key means shared rate limits.
- Never commit keys. Use `.env` files (gitignored) or secret managers.
