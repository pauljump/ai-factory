export function generateClaudeMd(name: string): string {
  return `# ${name} — Koba Factory

Read this first every session.

<!-- koba:user-start:how-we-work -->
## How We Work

[Describe how you work here. This section is yours — koba will never overwrite it.]

<!-- koba:user-end:how-we-work -->

<!-- koba:auto-start:stack -->
## Stack

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:stack -->

<!-- koba:auto-start:active-projects -->
## Active Projects

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:active-projects -->

<!-- koba:auto-start:packages -->
## Shared Packages

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:packages -->

<!-- koba:auto-start:knowledge -->
## Knowledge Domains

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:knowledge -->

## Factory Rules

1. Before building: check knowledge base for relevant expertise
2. SessionStart hook injects relevant knowledge automatically
3. After building: propose new knowledge entries
4. New shared code extracted when patterns repeat across projects
5. Every project gets a scorecard
`
}
