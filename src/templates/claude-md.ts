export function generateClaudeMd(name: string): string {
  return `# ${name} — AI Factory

Read soul.md first, then this file, every session.

<!-- factory:user-start:how-we-work -->
## How We Work

[Describe how you work here. This section is yours — factory will never overwrite it.]

<!-- factory:user-end:how-we-work -->

<!-- factory:user-start:what-not-to-build -->
## What NOT to Build

[Your constraints go here. factory will never overwrite this.]

<!-- factory:user-end:what-not-to-build -->

<!-- factory:auto-start:conventions -->
## Factory Conventions

Run \`factory scan\` to detect conventions across projects.

<!-- factory:auto-end:conventions -->

<!-- factory:auto-start:stack -->
## Stack

Run \`factory scan\` to populate this section.

<!-- factory:auto-end:stack -->

<!-- factory:auto-start:active-projects -->
## Active Projects

Run \`factory scan\` to populate this section.

<!-- factory:auto-end:active-projects -->

<!-- factory:auto-start:packages -->
## Shared Packages

Run \`factory scan\` to populate this section.

<!-- factory:auto-end:packages -->

<!-- factory:auto-start:playbooks -->
## Playbooks

Run \`factory scan\` to populate this section.

<!-- factory:auto-end:playbooks -->

<!-- factory:auto-start:knowledge -->
## Knowledge Domains

Run \`factory scan\` to populate this section.

<!-- factory:auto-end:knowledge -->

<!-- factory:auto-start:health -->
## Factory Health

Run \`factory scan\` to populate this section.

<!-- factory:auto-end:health -->
`
}
