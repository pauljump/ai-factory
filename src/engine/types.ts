/** A structured knowledge entry as stored in markdown frontmatter files */
export interface KnowledgeEntry {
  /** Unique ID (filename without extension, e.g., "cloud-run-sqlite-wal") */
  id: string
  /** Domain category (e.g., "cloud-run", "ios", "data-sources") */
  domain: string
  /** Searchable tags */
  tags: string[]
  /** How confident we are: high, medium, low */
  confidence: 'high' | 'medium' | 'low'
  /** Which project this was learned from */
  sourceProject: string
  /** When this entry was created */
  date: string
  /** When this entry was last verified as still accurate */
  lastVerified: string
  /** How many times the SessionStart hook has injected this entry */
  timesInjected: number
  /** How many times the user marked this entry as useful in a session */
  timesUseful: number
  /** The knowledge content (markdown body) */
  body: string
}

/** Scanner output for a single project */
export interface ProjectScan {
  /** Project directory name */
  name: string
  /** Absolute path */
  path: string
  /** Detected language/framework */
  framework: string
  /** Direct dependencies (from package.json, Podfile, etc.) */
  dependencies: string[]
  /** Workspace package dependencies (from @pauljump/*) */
  sharedPackages: string[]
  /** Infrastructure patterns detected */
  infrastructure: string[]
  /** External data sources (APIs, scraped URLs) */
  dataSources: string[]
  /** Whether a CLAUDE.md exists */
  hasClaudeMd: boolean
  /** Whether a deploy config exists (Dockerfile, cloud-run config, etc.) */
  hasDeployConfig: boolean
}

/** Baseline metrics extracted from git history for one project */
export interface ProjectBaseline {
  name: string
  /** First commit date */
  firstCommit: string
  /** Last commit date */
  lastCommit: string
  /** Total number of commits */
  commitCount: number
  /** Estimated number of sessions (clusters of commits within 4 hours) */
  estimatedSessions: number
  /** Date of first deploy tag or Dockerfile commit, if found */
  firstDeploy: string | null
  /** Days from first commit to first deploy */
  daysToFirstDeploy: number | null
  /** Project category */
  category: 'ios' | 'web' | 'api' | 'data-pipeline' | 'other'
}

/** A factory session event logged to analytics */
export interface SessionEvent {
  event: string
  properties: Record<string, unknown>
}

/** Scorecard for a factory-built project */
export interface Scorecard {
  project: string
  category: string
  comparableBaseline: string | null
  phase: number
  controlGroup: boolean
  sessionsToProduction: number
  baselineSessions: number | null
  wallClockHours: number
  sharedPackagesUsed: string[]
  knowledgeInjected: number
  knowledgeUseful: number
  knowledgeCaptured: number
  knowledgeProposed: number
  bugsFromKnownGotchas: number
  newSharedCodeExtracted: number
  leverageRatio: number | null
  journalEntry: string
  sessionFeltFaster: boolean | null
  knownGotchaAvoided: string | null
}

/** Result of discovering projects and packages in a source directory */
export interface DiscoveryResult {
  projects: DiscoveredProject[]
  packages: DiscoveredPackage[]
  sourceRoot: string
}

export interface DiscoveredProject {
  name: string
  path: string
  framework: string
  hasClaudeMd: boolean
  hasDeployConfig: boolean
  activity: 'active' | 'dormant' | 'dead'
  lastCommitDate: string | null
  commitCount: number
  estimatedSessions: number
  dependencies: string[]
  sharedPackages: string[]
}

export interface DiscoveredPackage {
  name: string
  path: string
  consumers: number
  consumerNames: string[]
}

export interface ConversionPlan {
  source: string
  workspace: string
  projects: {
    active: DiscoveredProject[]
    archived: DiscoveredProject[]
  }
  packages: DiscoveredPackage[]
  knowledgeEntries: number
  summary: string
}
