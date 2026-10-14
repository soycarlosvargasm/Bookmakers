export const SESSION_STATES = ["NOT_CONFIGURED", "AUTH_REQUIRED", "AUTHENTICATING", "ACTIVE", "EXPIRED", "LOCKED", "ERROR"] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export type SessionRecord = {
  sportsbook: string;
  accountAlias: string;
  state: SessionState;
  updatedAt: string;
  lastValidatedAt?: string;
  errorMessage?: string;
};

