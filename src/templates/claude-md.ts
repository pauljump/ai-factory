export function generateClaudeMd(name: string): string {
  return `# ${name} — Koba Factory

Read soul.md first, then this file, every session.

<!-- koba:user-start:how-we-work -->
## How We Work

[Describe how you work here. This section is yours — koba will never overwrite it.]

<!-- koba:user-end:how-we-work -->

<!-- koba:user-start:what-not-to-build -->
## What NOT to Build

[Your constraints go here. koba will never overwrite this.]

<!-- koba:user-end:what-not-to-build -->

<!-- koba:auto-start:conventions -->
## Factory Conventions

Run \`koba scan\` to detect conventions across projects.

<!-- koba:auto-end:conventions -->

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

<!-- koba:auto-start:playbooks -->
## Playbooks

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:playbooks -->

<!-- koba:auto-start:knowledge -->
## Knowledge Domains

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:knowledge -->

<!-- koba:auto-start:health -->
## Factory Health

Run \`koba scan\` to populate this section.

<!-- koba:auto-end:health -->
`
}
