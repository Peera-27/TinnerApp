type Bucket = { count: number, reset_at: number }

export type RateLimitResult = { allowed: boolean, retry_after: number }

export type RateLimiter = {
    /** Counts one hit against `key` and says whether it is still under the limit. */
    check(key: string): RateLimitResult
    /** Drops the counter for `key` — used after a successful login. */
    reset(key: string): void
}

/**
 * Fixed-window counter kept in memory. The app is a single Bun process, so a
 * shared store would be overkill here; the trade-off is that the counters start
 * from zero again after a restart.
 */
export function createRateLimiter(limit: number, window_ms: number): RateLimiter {
    const buckets = new Map<string, Bucket>()
    let last_sweep = Date.now()

    /** Drops expired buckets so a stream of one-off keys cannot grow the map forever. */
    function sweep(now: number) {
        if (now - last_sweep < window_ms) return
        last_sweep = now
        for (const [key, bucket] of buckets)
            if (bucket.reset_at <= now) buckets.delete(key)
    }

    return {
        check(key: string): RateLimitResult {
            const now = Date.now()
            sweep(now)

            const bucket = buckets.get(key)
            if (!bucket || bucket.reset_at <= now) {
                buckets.set(key, { count: 1, reset_at: now + window_ms })
                return { allowed: true, retry_after: 0 }
            }

            bucket.count++
            if (bucket.count > limit)
                return { allowed: false, retry_after: Math.ceil((bucket.reset_at - now) / 1000) }

            return { allowed: true, retry_after: 0 }
        },

        reset(key: string) {
            buckets.delete(key)
        },
    }
}

/** Just the slice of Bun's `Server` that `clientIp` needs. */
type IpSource = { requestIP(request: Request): { address: string } | null } | null | undefined

/**
 * Best-effort caller identity for IP-keyed limits. `x-forwarded-for` is trusted
 * because the production build sits behind a reverse proxy; on a direct
 * connection the socket address is used instead.
 */
export function clientIp(request: Request, server: IpSource): string {
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim()
        if (first) return first
    }
    return server?.requestIP(request)?.address ?? "unknown"
}
