export interface FetchOptions {
  /** Request timeout in ms. Defaults to 10000 (10s). */
  timeout?: number
  /** Number of retries on failure. Defaults to 2. */
  retries?: number
  /** HTTP method. Defaults to 'GET'. */
  method?: string
  /** Request headers. */
  headers?: Record<string, string>
  /** JSON body (automatically stringified). */
  body?: unknown
}

/**
 * Fetch JSON from an external API with retries and timeout.
 * Use this for all third-party API calls (price feeds, LLMs, maps, etc.)
 */
export async function fetchJSON<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 10_000, retries = 2, method = 'GET', headers = {}, body } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json() as T
    } catch (err) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError!
}
