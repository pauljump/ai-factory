export function generateFactoryConfig(name: string): object {
  return {
    name,
    version: '1.0.0',
    stack: {
      supported: [],
      node: '22',
      packageManager: 'pnpm',
    },
    conventions: {
      commitStyle: 'conventional',
      branchStrategy: 'main-only',
    },
    scan: {
      excludeDirs: ['node_modules', '.git', 'dist', '_archive'],
      extractionThreshold: 3,
      staleKnowledgeDays: 90,
    },
  }
}
