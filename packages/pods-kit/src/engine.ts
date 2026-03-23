import type Database from 'better-sqlite3'
import type { PodsConfig, MatchVector, Pod, PodMember, PodMessage, PodWithMembers, DmThread, DmMessage, DmThreadSummary } from './types.js'

const DISPLAY_NAMES = [
  'Sunrise', 'Moonbeam', 'Starlight', 'Raindrop', 'Pebble',
  'Willow', 'Clover', 'Sparrow', 'Ember', 'Breeze',
  'Cedar', 'Fern', 'Robin', 'Sage', 'River',
  'Maple', 'Wren', 'Ivy', 'Finch', 'Harbor',
  'Meadow', 'Lark', 'Aspen', 'Coral', 'Haven',
]

const POD_NAMES = [
  'The Calm Crew', 'Team Sunshine', 'The Steady Hands', 'Circle of Calm',
  'The Brave Ones', 'Little Victories', 'The Lighthouse', 'Safe Harbor',
  'The Dandelions', 'Gentle Giants', 'The Anchor', 'Bright Sparks',
  'The Stepping Stones', 'Starfish Pod', 'The Oak Table', 'Warm Front',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

function generateDisplayName(existingNames: string[]): string {
  const available = DISPLAY_NAMES.filter(n => !existingNames.includes(n))
  if (available.length > 0) return pickRandom(available)
  // Fallback: name + number
  return `${pickRandom(DISPLAY_NAMES)}${Math.floor(Math.random() * 99) + 1}`
}

/**
 * Compute similarity between two match vectors.
 * Returns 0-1 where 1 is perfect match.
 * Exact matches on each dimension score 1/N, mismatches score 0.
 */
function matchScore(a: MatchVector, b: MatchVector): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  if (keys.size === 0) return 1
  let score = 0
  for (const key of keys) {
    if (a[key] === b[key]) score += 1
  }
  return score / keys.size
}

export class PodsEngine {
  constructor(
    private db: Database.Database,
    private config: PodsConfig,
  ) {}

  // --- Unlock ---

  getUnlockStatus(userId: string): { unlocked: boolean; active_days: number; tool_sessions: number } {
    const row = this.db.prepare(
      'SELECT unlocked, active_days, tool_sessions FROM pod_unlock_status WHERE user_id = ?'
    ).get(userId) as any
    if (!row) return { unlocked: false, active_days: 0, tool_sessions: 0 }
    return { unlocked: !!row.unlocked, active_days: row.active_days, tool_sessions: row.tool_sessions }
  }

  updateUnlockProgress(userId: string, activeDays: number, toolSessions: number): boolean {
    const unlocked = activeDays >= this.config.unlockDays && toolSessions >= this.config.unlockSessions
    this.db.prepare(`
      INSERT INTO pod_unlock_status (user_id, active_days, tool_sessions, unlocked, unlocked_at, last_checked)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        active_days = ?, tool_sessions = ?, unlocked = ?,
        unlocked_at = CASE WHEN ? AND NOT unlocked THEN datetime('now') ELSE unlocked_at END,
        last_checked = datetime('now')
    `).run(
      userId, activeDays, toolSessions, unlocked ? 1 : 0, unlocked ? 1 : 0,
      activeDays, toolSessions, unlocked ? 1 : 0, unlocked ? 1 : 0,
    )
    return unlocked
  }

  // --- Match Queue ---

  async joinQueue(userId: string): Promise<{ queued: boolean; matched: boolean; pod_id?: string }> {
    // Check unlock
    const status = this.getUnlockStatus(userId)
    if (!status.unlocked) return { queued: false, matched: false }

    // Check if already in max pods
    const activePods = this.getUserPods(userId)
    if (activePods.length >= this.config.maxPodsPerUser) {
      return { queued: false, matched: false }
    }

    // Compute match vector
    const vector = await this.config.computeMatchVector(userId)

    // Add to queue (upsert)
    this.db.prepare(`
      INSERT INTO pod_match_queue (user_id, match_vector, queued_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET match_vector = ?, queued_at = datetime('now')
    `).run(userId, JSON.stringify(vector), JSON.stringify(vector))

    // Try to form a pod
    const pod = this.tryMatch(userId, vector)
    if (pod) {
      return { queued: false, matched: true, pod_id: pod.id }
    }

    return { queued: true, matched: false }
  }

  private tryMatch(userId: string, userVector: MatchVector): Pod | null {
    // Get all users in queue (excluding those who overlap with this user's existing pods)
    const existingPodMates = this.getExistingPodMates(userId)
    const excludeIds = new Set([userId, ...existingPodMates])

    const candidates = this.db.prepare(
      'SELECT user_id, match_vector FROM pod_match_queue'
    ).all() as { user_id: string; match_vector: string }[]

    // Score and filter candidates
    const scored = candidates
      .filter(c => !excludeIds.has(c.user_id))
      .map(c => ({
        user_id: c.user_id,
        vector: JSON.parse(c.match_vector) as MatchVector,
        score: matchScore(userVector, JSON.parse(c.match_vector) as MatchVector),
      }))
      .filter(c => c.score >= 0.6) // Minimum 60% match
      .sort((a, b) => b.score - a.score)

    // Also check no-overlap for candidates against each other
    const podMembers = [{ user_id: userId, vector: userVector }]
    for (const candidate of scored) {
      if (podMembers.length >= this.config.podSize) break

      // Check this candidate doesn't overlap with anyone already picked
      const candidatePodMates = this.getExistingPodMates(candidate.user_id)
      const overlaps = podMembers.some(m => candidatePodMates.includes(m.user_id))
      if (!overlaps) {
        podMembers.push(candidate)
      }
    }

    // Need minimum viable pod size
    if (podMembers.length < this.config.minViablePod) return null

    // Create the pod
    return this.createPod(podMembers.map(m => m.user_id), userVector)
  }

  private getExistingPodMates(userId: string): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT pm2.user_id FROM pod_members pm1
      JOIN pod_members pm2 ON pm1.pod_id = pm2.pod_id AND pm2.user_id != ?
      WHERE pm1.user_id = ? AND pm1.status = 'active' AND pm2.status = 'active'
    `).all(userId, userId) as { user_id: string }[]
    return rows.map(r => r.user_id)
  }

  private createPod(memberIds: string[], matchCriteria: MatchVector): Pod {
    const podId = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
    const podName = this.config.generatePodName?.() ?? pickRandom(POD_NAMES)

    const create = this.db.transaction(() => {
      // Create pod
      this.db.prepare(`
        INSERT INTO pods (id, name, match_criteria, max_members)
        VALUES (?, ?, ?, ?)
      `).run(podId, podName, JSON.stringify(matchCriteria), this.config.podSize)

      // Add members
      const usedNames: string[] = []
      for (const userId of memberIds) {
        const displayName = generateDisplayName(usedNames)
        usedNames.push(displayName)

        this.db.prepare(`
          INSERT INTO pod_members (pod_id, user_id, display_name)
          VALUES (?, ?, ?)
        `).run(podId, userId, displayName)

        // Remove from queue
        this.db.prepare('DELETE FROM pod_match_queue WHERE user_id = ?').run(userId)
      }

      // System welcome message
      this.db.prepare(`
        INSERT INTO pod_messages (id, pod_id, user_id, message_type, content)
        VALUES (?, ?, NULL, 'system', ?)
      `).run(
        crypto.randomUUID().replace(/-/g, '').slice(0, 32),
        podId,
        `Welcome to ${podName}! You've been matched with ${memberIds.length - 1} other parents who are on a similar journey. This is your space — share what's working, vent about what's hard, and know that everyone here gets it.`,
      )
    })

    create()

    return this.db.prepare('SELECT * FROM pods WHERE id = ?').get(podId) as Pod
  }

  // --- Pod Access ---

  getUserPods(userId: string): PodWithMembers[] {
    const pods = this.db.prepare(`
      SELECT p.* FROM pods p
      JOIN pod_members pm ON p.id = pm.pod_id
      WHERE pm.user_id = ? AND pm.status = 'active' AND p.status = 'active'
    `).all(userId) as Pod[]

    return pods.map(pod => {
      const members = this.db.prepare(
        'SELECT * FROM pod_members WHERE pod_id = ? AND status = ?'
      ).all(pod.id, 'active') as PodMember[]
      return { ...pod, members, member_count: members.length }
    })
  }

  getPod(podId: string, userId: string): PodWithMembers | null {
    // Verify user is a member
    const member = this.db.prepare(
      'SELECT 1 FROM pod_members WHERE pod_id = ? AND user_id = ? AND status = ?'
    ).get(podId, userId, 'active')
    if (!member) return null

    const pod = this.db.prepare('SELECT * FROM pods WHERE id = ?').get(podId) as Pod | undefined
    if (!pod) return null

    const members = this.db.prepare(
      'SELECT * FROM pod_members WHERE pod_id = ? AND status = ?'
    ).all(podId, 'active') as PodMember[]

    return { ...pod, members, member_count: members.length }
  }

  // --- Messages ---

  getMessages(podId: string, userId: string, page = 1, pageSize = 30): { messages: PodMessage[]; page: number; has_more: boolean } {
    const offset = (page - 1) * pageSize

    const messages = this.db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM pod_reactions WHERE message_id = m.id) as reactions,
        (SELECT COUNT(*) FROM pod_reactions WHERE message_id = m.id AND user_id = ?) as user_reacted
      FROM pod_messages m
      WHERE m.pod_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, podId, pageSize + 1, offset) as (PodMessage & { reactions: number; user_reacted: number })[]

    const hasMore = messages.length > pageSize
    const result = messages.slice(0, pageSize).map(m => {
      const { user_reacted: ur, ...rest } = m as any
      return { ...rest, user_reacted: !!ur } as PodMessage
    })

    return { messages: result, page, has_more: hasMore }
  }

  sendMessage(podId: string, userId: string, content: string, type: 'text' | 'win_share' | 'tool_share' = 'text', metadata?: Record<string, unknown>): PodMessage {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
    this.db.prepare(`
      INSERT INTO pod_messages (id, pod_id, user_id, message_type, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, podId, userId, type, content, JSON.stringify(metadata ?? {}))

    return this.db.prepare('SELECT * FROM pod_messages WHERE id = ?').get(id) as PodMessage
  }

  addAiPrompt(podId: string, prompt: string): PodMessage {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
    this.db.prepare(`
      INSERT INTO pod_messages (id, pod_id, user_id, message_type, content)
      VALUES (?, ?, NULL, 'ai_prompt', ?)
    `).run(id, podId, prompt)
    return this.db.prepare('SELECT * FROM pod_messages WHERE id = ?').get(id) as PodMessage
  }

  // --- Reactions ---

  toggleReaction(messageId: string, userId: string): boolean {
    const existing = this.db.prepare(
      'SELECT 1 FROM pod_reactions WHERE message_id = ? AND user_id = ?'
    ).get(messageId, userId)

    if (existing) {
      this.db.prepare('DELETE FROM pod_reactions WHERE message_id = ? AND user_id = ?').run(messageId, userId)
      return false // removed
    } else {
      this.db.prepare(
        'INSERT INTO pod_reactions (message_id, user_id) VALUES (?, ?)'
      ).run(messageId, userId)
      return true // added
    }
  }

  // --- Leave ---

  leavePod(podId: string, userId: string, reason?: string): boolean {
    const result = this.db.prepare(`
      UPDATE pod_members SET status = 'left', left_at = datetime('now')
      WHERE pod_id = ? AND user_id = ? AND status = 'active'
    `).run(podId, userId)

    if (result.changes === 0) return false

    // Record exit interview
    if (reason) {
      this.db.prepare(`
        INSERT INTO pod_exit_interviews (id, pod_id, user_id, reason)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID().replace(/-/g, '').slice(0, 32), podId, userId, reason)
    }

    // System message
    const member = this.db.prepare(
      'SELECT display_name FROM pod_members WHERE pod_id = ? AND user_id = ?'
    ).get(podId, userId) as { display_name: string } | undefined

    if (member) {
      this.sendMessage(podId, '', `${member.display_name} has left the pod. A new member will join soon.`, 'text')
      // Fix: use system message type
      this.db.prepare(`
        UPDATE pod_messages SET user_id = NULL, message_type = 'system'
        WHERE pod_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT 1
      `).run(podId, `${member.display_name} has left%`)
    }

    // Check if pod is below minimum viable
    const activeCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM pod_members WHERE pod_id = ? AND status = ?'
    ).get(podId, 'active') as { count: number }

    if (activeCount.count < this.config.minViablePod) {
      // Archive the pod if too small
      this.db.prepare("UPDATE pods SET status = 'archived' WHERE id = ?").run(podId)
      // Re-queue remaining members
      const remaining = this.db.prepare(
        'SELECT user_id FROM pod_members WHERE pod_id = ? AND status = ?'
      ).all(podId, 'active') as { user_id: string }[]
      for (const m of remaining) {
        this.joinQueue(m.user_id) // async but fire-and-forget is fine
      }
    }

    return true
  }

  // --- Backfill ---

  async backfillPods(): Promise<number> {
    // Find pods below max that are still active
    const underfilled = this.db.prepare(`
      SELECT p.id, p.match_criteria,
        (SELECT COUNT(*) FROM pod_members WHERE pod_id = p.id AND status = 'active') as member_count
      FROM pods p WHERE p.status = 'active'
      HAVING member_count < p.max_members AND member_count >= ?
    `).all(this.config.minViablePod) as { id: string; match_criteria: string; member_count: number }[]

    let filled = 0
    for (const pod of underfilled) {
      const podCriteria = JSON.parse(pod.match_criteria) as MatchVector
      const existingMembers = this.db.prepare(
        'SELECT user_id FROM pod_members WHERE pod_id = ? AND status = ?'
      ).all(pod.id, 'active') as { user_id: string }[]
      const existingIds = new Set(existingMembers.map(m => m.user_id))

      // Find queue candidates that match
      const candidates = this.db.prepare('SELECT * FROM pod_match_queue').all() as { user_id: string; match_vector: string }[]

      for (const candidate of candidates) {
        if (existingIds.has(candidate.user_id)) continue

        const candidateVector = JSON.parse(candidate.match_vector) as MatchVector
        if (matchScore(podCriteria, candidateVector) < 0.6) continue

        // Check no-overlap
        const podMates = this.getExistingPodMates(candidate.user_id)
        if (existingMembers.some(m => podMates.includes(m.user_id))) continue

        // Add to pod
        const usedNames = this.db.prepare(
          'SELECT display_name FROM pod_members WHERE pod_id = ?'
        ).all(pod.id) as { display_name: string }[]
        const displayName = generateDisplayName(usedNames.map(n => n.display_name))

        this.db.prepare('INSERT INTO pod_members (pod_id, user_id, display_name) VALUES (?, ?, ?)').run(pod.id, candidate.user_id, displayName)
        this.db.prepare('DELETE FROM pod_match_queue WHERE user_id = ?').run(candidate.user_id)

        // Welcome message
        this.db.prepare(`
          INSERT INTO pod_messages (id, pod_id, user_id, message_type, content)
          VALUES (?, ?, NULL, 'system', ?)
        `).run(
          crypto.randomUUID().replace(/-/g, '').slice(0, 32),
          pod.id,
          `${displayName} has joined the pod. Welcome!`,
        )

        filled++
        break // one per pod per backfill run
      }
    }
    return filled
  }

  // --- Direct Messages ---

  /**
   * Get or create a DM thread between two users.
   * Users must share at least one active pod.
   */
  getOrCreateDmThread(userId: string, otherUserId: string): DmThread | null {
    // Verify they share a pod
    const shared = this.db.prepare(`
      SELECT 1 FROM pod_members pm1
      JOIN pod_members pm2 ON pm1.pod_id = pm2.pod_id
      WHERE pm1.user_id = ? AND pm2.user_id = ?
        AND pm1.status = 'active' AND pm2.status = 'active'
      LIMIT 1
    `).get(userId, otherUserId)
    if (!shared) return null

    // Canonical ordering: lower ID = user_a
    const [userA, userB] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId]

    // Upsert
    this.db.prepare(`
      INSERT INTO dm_threads (id, user_a, user_b)
      VALUES (?, ?, ?)
      ON CONFLICT(user_a, user_b) DO NOTHING
    `).run(crypto.randomUUID().replace(/-/g, '').slice(0, 32), userA, userB)

    return this.db.prepare(
      'SELECT * FROM dm_threads WHERE user_a = ? AND user_b = ?'
    ).get(userA, userB) as DmThread
  }

  /** List all DM threads for a user with last message preview. */
  listDmThreads(userId: string): DmThreadSummary[] {
    const threads = this.db.prepare(`
      SELECT t.*,
        CASE WHEN t.user_a = ? THEN t.user_b ELSE t.user_a END as other_user_id
      FROM dm_threads t
      WHERE t.user_a = ? OR t.user_b = ?
      ORDER BY t.created_at DESC
    `).all(userId, userId, userId) as (DmThread & { other_user_id: string })[]

    return threads.map(t => {
      // Get last message
      const lastMsg = this.db.prepare(
        'SELECT content, created_at FROM dm_messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(t.id) as { content: string; created_at: string } | undefined

      // Get display name from any shared pod
      const member = this.db.prepare(
        'SELECT display_name FROM pod_members WHERE user_id = ? AND status = ? LIMIT 1'
      ).get(t.other_user_id, 'active') as { display_name: string } | undefined

      return {
        ...t,
        other_display_name: member?.display_name ?? 'Member',
        last_message: lastMsg?.content ?? null,
        last_message_at: lastMsg?.created_at ?? null,
      }
    }).sort((a, b) => {
      // Sort by last message time (most recent first), threads with no messages last
      const aTime = a.last_message_at ?? a.created_at
      const bTime = b.last_message_at ?? b.created_at
      return bTime.localeCompare(aTime)
    })
  }

  /** Get messages in a DM thread. */
  getDmMessages(threadId: string, userId: string, page = 1, pageSize = 30): { messages: DmMessage[]; page: number; has_more: boolean } | null {
    // Verify user is part of this thread
    const thread = this.db.prepare(
      'SELECT * FROM dm_threads WHERE id = ? AND (user_a = ? OR user_b = ?)'
    ).get(threadId, userId, userId)
    if (!thread) return null

    const offset = (page - 1) * pageSize
    const messages = this.db.prepare(`
      SELECT * FROM dm_messages
      WHERE thread_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(threadId, pageSize + 1, offset) as DmMessage[]

    const hasMore = messages.length > pageSize
    return { messages: messages.slice(0, pageSize), page, has_more: hasMore }
  }

  /** Send a DM. */
  sendDm(threadId: string, senderId: string, content: string): DmMessage | null {
    // Verify sender is part of thread
    const thread = this.db.prepare(
      'SELECT * FROM dm_threads WHERE id = ? AND (user_a = ? OR user_b = ?)'
    ).get(threadId, senderId, senderId)
    if (!thread) return null

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
    this.db.prepare(
      'INSERT INTO dm_messages (id, thread_id, sender_id, content) VALUES (?, ?, ?, ?)'
    ).run(id, threadId, senderId, content)

    return this.db.prepare('SELECT * FROM dm_messages WHERE id = ?').get(id) as DmMessage
  }

  // --- Daily AI Prompts ---

  async generateDailyPrompts(): Promise<number> {
    if (!this.config.generatePrompt) return 0

    const activePods = this.db.prepare("SELECT * FROM pods WHERE status = 'active'").all() as Pod[]
    let generated = 0

    for (const pod of activePods) {
      // Check if already prompted today
      const todayPrompt = this.db.prepare(`
        SELECT 1 FROM pod_messages
        WHERE pod_id = ? AND message_type = 'ai_prompt' AND date(created_at) = date('now')
      `).get(pod.id)
      if (todayPrompt) continue

      const members = this.db.prepare(
        'SELECT * FROM pod_members WHERE pod_id = ? AND status = ?'
      ).all(pod.id, 'active') as PodMember[]

      const recentMessages = this.db.prepare(`
        SELECT * FROM pod_messages WHERE pod_id = ?
        ORDER BY created_at DESC LIMIT 20
      `).all(pod.id) as PodMessage[]

      try {
        const prompt = await this.config.generatePrompt(pod, members, recentMessages)
        this.addAiPrompt(pod.id, prompt)
        generated++
      } catch {
        // Skip this pod on error
      }
    }
    return generated
  }
}
