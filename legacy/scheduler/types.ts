export type SchedulerConfig = {
  liveIntervalMs: number;
  prematchNearIntervalMs: number;
  prematchFarIntervalMs: number;
  idleIntervalMs: number;
  errorBackoffMs: number;
  maxRequestsPerMinute: number;
};

export type SchedulerMode = "live" | "prematch-near" | "prematch-far" | "idle" | "error";

