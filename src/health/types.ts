export const HEALTH_STATUSES = ["HEALTHY", "DEGRADED", "AUTH_REQUIRED", "UNHEALTHY", "DISABLED"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export type SourceHealth = {
  sportsbook: string;
  accountAlias: string;
  status: HealthStatus;
  checkedAt: string;
  message?: string;
};

