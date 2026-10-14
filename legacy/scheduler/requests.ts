/** Budgets apply to each outbound attempt, including health checks and retries. */
export type RequestPolicy = { maxRequestsPerMinute: number; maxConcurrency: number; maxRetries: number; baseBackoffMs: number; maxBackoffMs: number };
export const DEFAULT_REQUEST_POLICY: RequestPolicy = { maxRequestsPerMinute: 60, maxConcurrency: 4, maxRetries: 2, baseBackoffMs: 500, maxBackoffMs: 30_000 };
export const retryAfterMs = (value: string | null, now = Date.now()): number => {
  if (!value) return 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(value) - now) || 0;
};
export class HttpRequestError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter = 0) { super(message); }
}
type Runtime = { now: () => number; sleep: (ms: number) => Promise<void>; random: () => number };
const runtime: Runtime = { now: Date.now, sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random: Math.random };
export class RequestGovernor {
  private readonly starts: number[] = [];
  private active = 0;
  private blockedUntil = 0;
  private readonly waiters: Array<() => void> = [];
  constructor(readonly policy: RequestPolicy = DEFAULT_REQUEST_POLICY, private readonly clock: Runtime = runtime) {
    if (!(policy.maxRequestsPerMinute >= 1) || !Number.isInteger(policy.maxRequestsPerMinute) || !(policy.maxConcurrency >= 1) || !Number.isInteger(policy.maxConcurrency)) throw new Error("Request limits must be positive integers");
  }
  private async acquire(): Promise<void> {
    for (;;) {
      const now = this.clock.now();
      while (this.starts.length && this.starts[0]! <= now - 60_000) this.starts.shift();
      if (this.active >= this.policy.maxConcurrency) { await new Promise<void>((resolve) => this.waiters.push(resolve)); continue; }
      const wait = Math.max(this.blockedUntil - now, this.starts.length >= this.policy.maxRequestsPerMinute ? this.starts[0]! + 60_000 - now : 0);
      if (wait > 0) { await this.clock.sleep(wait); continue; }
      this.active++; this.starts.push(now); return;
    }
  }
  async run<T>(request: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.acquire();
      let retryDelay: number | undefined;
      try { return await request(); }
      catch (error) {
        const status = error instanceof HttpRequestError ? error.status : (error as { status?: number })?.status;
        const retryable = status === 429 || (status !== undefined && status >= 500) || (error instanceof Error && ["TimeoutError", "AbortError", "TypeError"].includes(error.name));
        const retryAfter = error instanceof HttpRequestError ? error.retryAfter : 0;
        if (retryAfter > 0) this.blockedUntil = Math.max(this.blockedUntil, this.clock.now() + retryAfter);
        if (!retryable || attempt >= this.policy.maxRetries) throw error;
        retryDelay = Math.max(retryAfter, this.clock.random() * Math.min(this.policy.maxBackoffMs, this.policy.baseBackoffMs * 2 ** attempt));
      } finally {
        this.active--;
        for (const wake of this.waiters.splice(0)) wake();
      }
      if (retryDelay) await this.clock.sleep(retryDelay);
    }
  }
}
const governors = new Map<string, RequestGovernor>();
export const requestGovernorFor = (source: string): RequestGovernor => {
  let governor = governors.get(source);
  if (!governor) { governor = new RequestGovernor(); governors.set(source, governor); }
  return governor;
};
