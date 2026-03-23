import { z } from 'zod'

// App-provided configuration
export interface PodsConfig {
  /** How many days of active use before pods unlock */
  unlockDays: number
  /** How many tool/feature sessions before pods unlock */
  unlockSessions: number
  /** Max members per pod */
  podSize: number
  /** Max pods a single user can be in */
  maxPodsPerUser: number
  /** Minimum pod size before actively backfilling */
  minViablePod: number
  /** Hours to wait before relaxing match criteria */
  matchRelaxAfterHours: number
  /**
   * App-provided function to compute match vector from user data.
   * Returns a JSON-serializable object with the match dimensions.
   */
  computeMatchVector: (userId: string) => Promise<MatchVector>
  /**
   * App-provided function to generate an AI prompt for a pod.
   * Receives pod member summaries and recent activity.
   */
  generatePrompt?: (pod: Pod, members: PodMember[], recentMessages: PodMessage[]) => Promise<string>
  /**
   * App-provided function to generate a warm pod name.
   */
  generatePodName?: () => string
}

export interface MatchVector {
  [dimension: string]: string | number
}

export interface Pod {
  id: string
  name: string
  match_criteria: string // JSON
  max_members: number
  status: 'active' | 'archived'
  created_at: string
}

export interface PodMember {
  pod_id: string
  user_id: string
  display_name: string
  joined_at: string
  left_at: string | null
  status: 'active' | 'left'
}

export interface PodMessage {
  id: string
  pod_id: string
  user_id: string | null
  message_type: 'text' | 'ai_prompt' | 'win_share' | 'tool_share' | 'system'
  content: string
  metadata: string // JSON
  created_at: string
  reactions?: number
  user_reacted?: boolean
}

export interface PodWithMembers extends Pod {
  members: PodMember[]
  member_count: number
}

// --- DM Types ---

export interface DmThread {
  id: string
  user_a: string
  user_b: string
  created_at: string
}

export interface DmMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string
  created_at: string
}

export interface DmThreadSummary extends DmThread {
  other_user_id: string
  other_display_name: string
  last_message: string | null
  last_message_at: string | null
}

export const dmMessageBodySchema = z.object({
  content: z.string().min(1).max(500),
})

export const messageBodySchema = z.object({
  content: z.string().min(1).max(500),
  message_type: z.enum(['text', 'win_share', 'tool_share']).default('text'),
  metadata: z.record(z.unknown()).optional(),
})

export const exitReasonSchema = z.object({
  reason: z.enum(['bad_match', 'too_busy', 'found_what_i_needed', 'other']),
})

export type ExitReason = z.infer<typeof exitReasonSchema>['reason']
