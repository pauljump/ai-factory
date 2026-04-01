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

/** A playbook — executable knowledge, not just a fact */
export interface Playbook {
  /** Filename slug (e.g., "cloud-run-deploy") */
  id: string
  /** Human-readable name */
  name: string
  /** What triggers this playbook (framework tags, file patterns, etc.) */
  triggers: string[]
  /** Projects that use this pattern */
  projectsUsing: string[]
  /** When this was last verified as accurate */
  lastVerified: string
  /** Confidence: high = battle-tested, medium = used once, low = template only */
  confidence: 'high' | 'medium' | 'low'
  /** The full playbook content (markdown body) */
  body: string
}

/** A convention detected across multiple projects */
export interface Convention {
  /** What the convention is (e.g., "commit to main, no branches") */
  pattern: string
  /** How many projects follow this convention */
  projectCount: number
  /** Which projects follow it */
  projects: string[]
  /** Source section in CLAUDE.md where this was found */
  source: string
}

/** Soul — the factory's personality and collaboration style */
export interface Soul {
  /** Core principles for how the AI collaborates */
  principles: string[]
  /** Role definitions (who does what) */
  roles: { name: string; description: string }[]
  /** The collaboration loop */
  loop: string[]
  /** Constraints and corrections */
  constraints: string[]
  /** Full rendered markdown */
  body: string
}

/** A test case for evaluating knowledge retrieval quality */
export interface EvalCase {
  /** Unique test case ID */
  id: string
  /** The search query to run against the knowledge store */
  query: string
  /** IDs of knowledge entries that SHOULD be retrieved for this query */
  relevantIds: string[]
  /** Optional tags to also search by */
  tags?: string[]
}

/** Result of running one eval case against the knowledge store */
export interface EvalResult {
  /** Which test case this result is for */
  caseId: string
  /** The query that was run */
  query: string
  /** IDs of entries actually retrieved (in rank order) */
  retrievedIds: string[]
  /** IDs of entries that should have been retrieved */
  relevantIds: string[]
  /** Precision: |retrieved ∩ relevant| / |retrieved| */
  precision: number
  /** Recall: |retrieved ∩ relevant| / |relevant| */
  recall: number
  /** Reciprocal rank: 1 / position of first relevant result (0 if none) */
  reciprocalRank: number
}

/** Aggregated scorecard from running all eval cases */
export interface EvalScorecard {
  /** When this eval was run */
  timestamp: string
  /** Total number of test cases */
  totalCases: number
  /** Mean precision across all cases */
  meanPrecision: number
  /** Mean recall across all cases */
  meanRecall: number
  /** Mean reciprocal rank across all cases */
  meanReciprocalRank: number
  /** Individual case results */
  results: EvalResult[]
}
