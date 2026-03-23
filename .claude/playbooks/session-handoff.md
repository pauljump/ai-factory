# Playbook: Session Handoff

Paul switches between projects constantly. Every session ends with a handoff so the next session (which may be a different Claude instance, days later) can pick up cold without asking "where were we?"

Learned from: Every session (formalized 2026-03-14)

## When to Run This

**Every time Paul says anything like:**
- "I'm ending the session"
- "Let's wrap up"
- "Document where we are"
- "I need to switch to [other project]"
- Any signal the session is closing

**Also run this proactively** if you've made significant progress and haven't updated the project's Current State section recently.

## The Handoff (4 steps, do all four)

### 1. Update the Project CLAUDE.md — Current State

Update the `## Current State` section with:

```markdown
## Current State

**Status:** (exploring / building / shipping / maintaining)
**Last updated:** YYYY-MM-DD
**iOS build:** N on TestFlight | **Backend rev:** N on Cloud Run  ← if applicable
**What just shipped:**
- Bullet list of what THIS session built/changed/fixed
- Be specific: "Visual Timer with sub-minute presets" not "added features"
**What's next:**
- What Paul said he wants next, or the natural next step
- Include issue numbers if they exist
**What's blocking:**
- Anything that can't proceed without a decision, external dependency, or Paul's input
```

**Rules:**
- "What just shipped" = this session only. Move previous session's items to a `## Recent History` section if needed, or just let them go — git log has the full record.
- "What's next" = Paul's words, not your guesses. If he didn't say, look at GitHub Issues.
- "What's blocking" = real blockers, not nice-to-haves. If nothing is blocking, say so.

### 2. Update Build Numbers & Deploy State

If you deployed anything this session, make sure the CLAUDE.md reflects:
- iOS build number on TestFlight
- Backend revision on Cloud Run
- Any new URLs or endpoints

### 3. Commit and Push to GitHub

Stage and commit all changes with a clear message. Then push to main.

```bash
# Stage the files you changed this session (be specific, don't use git add -A)
git add <files>
git commit -m "feat(project): what you built this session"
git push origin main
```

**Rules:**
- Commit message should summarize the session's work, not individual file changes
- Push to main — we don't use branches
- If there are uncommitted changes from OTHER projects you didn't touch this session, leave them alone unless Paul asks you to commit everything
- Never leave your own session's work uncommitted — the next session should be able to `git pull` and be ready

### 4. Verify GitHub is Clean

After pushing, run `git status` to confirm there's no work left behind. If there are uncommitted changes from your session, commit them. The goal: **next session starts with `git pull`, reads the project CLAUDE.md, and is immediately productive.**

## What NOT to Do

- **Don't write a separate handoff document.** The project CLAUDE.md IS the handoff. One source of truth.
- **Don't summarize the conversation.** The next session doesn't need to know what we discussed — it needs to know what's built, what's next, and what's blocking.
- **Don't create memory files for session-specific state.** That's what Current State is for.
- **Don't leave uncommitted changes.** The next session should be able to `git pull` and be ready.

## Example

Good Current State:
```
**Status:** building
**Last updated:** 2026-03-14
**iOS build:** 72 on TestFlight | **Backend rev:** 21 on Cloud Run
**What just shipped:**
- Visual Timer — calming countdown, sub-minute presets, parent lock, completion animation
- First-Then Board — templates, camera roll photos, full-screen mode, timer integration
- Tools tab — moved Stories into Tools alongside Timer and First-Then
- Tool outcome capture — all tools log usage to moments timeline with "Did this help?"
- Bug fixes: APIClient force unwraps, breathing animation leak, loadMore race condition
- iOS testing/debugging playbook
**What's next:**
- Test tool outcome logging end-to-end on device (build 72)
- Token Board (digital sticker chart)
- Deploy enriched directory.db with quality scores
**What's blocking:**
- BACB bulk scrape blocked by Cloudflare Turnstile
```
