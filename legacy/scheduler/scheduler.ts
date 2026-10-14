import type { SchedulerConfig, SchedulerMode } from "./types.js";
const modeKey: Record<SchedulerMode, keyof SchedulerConfig> = { live: "liveIntervalMs", "prematch-near": "prematchNearIntervalMs", "prematch-far": "prematchFarIntervalMs", idle: "idleIntervalMs", error: "errorBackoffMs" };
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = { liveIntervalMs: 5_000, prematchNearIntervalMs: 15_000, prematchFarIntervalMs: 60_000, idleIntervalMs: 300_000, errorBackoffMs: 30_000, maxRequestsPerMinute: 60 };
/** Request budgets belong to RequestGovernor, independently of polling frequency. */
export const nextDelayMs = (mode: SchedulerMode, config: SchedulerConfig): number => config[modeKey[mode]];
export class CollectorScheduler {
  private readonly jobs = new Map<string, { timer?: NodeJS.Timeout; cancelled: boolean }>();
  private readonly running = new Set<Promise<void>>();
  private readonly locks = new Set<string>();
  schedule(id: string, mode: SchedulerMode, config: SchedulerConfig, task: () => Promise<void>, onError?: (error: unknown) => void, group = id.split(":")[0]!): void {
    this.cancel(id);
    const job: { timer?: NodeJS.Timeout; cancelled: boolean } = { cancelled: false };
    this.jobs.set(id, job);
    let failures = 0;
    const tick = async (): Promise<void> => {
      if (job.cancelled) return;
      let ownsLock = false;
      try {
        if (!this.locks.has(group)) {
          this.locks.add(group); ownsLock = true;
          await task(); failures = 0;
        }
      } catch (error) {
        failures++;
        try { onError?.(error); } catch { /* Logging must never stop another connector. */ }
      } finally {
        if (ownsLock) this.locks.delete(group);
        if (!job.cancelled) {
          const backoff = failures ? Math.min(300_000, config.errorBackoffMs * 2 ** Math.min(failures - 1, 10)) * (0.5 + Math.random() * 0.5) : 0;
          job.timer = setTimeout(launch, Math.max(nextDelayMs(mode, config), backoff));
        }
      }
    };
    const launch = (): void => { const promise = tick(); this.running.add(promise); void promise.finally(() => this.running.delete(promise)); };
    job.timer = setTimeout(launch, 0);
  }
  cancel(id: string): void { const job = this.jobs.get(id); if (job) { job.cancelled = true; clearTimeout(job.timer); } this.jobs.delete(id); }
  shutdown(): void { for (const id of this.jobs.keys()) this.cancel(id); }
  async drain(): Promise<void> { await Promise.allSettled([...this.running]); }
}
