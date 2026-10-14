import type { HealthStatus } from "../health/types.js";
import type { RawPayloadInput, ProviderRecord } from "../normalization/types.js";

export type ConnectorContext = {
  sportsbook: string;
  accountAlias: string;
};

/**
 * A connector may return raw payloads, already-normalized records, or its own
 * provider-specific intermediate result. The collector only requires an
 * explicit adapter when it crosses into the common data model.
 */
export type ConnectorCollection = {
  rawPayloads?: RawPayloadInput[];
  normalizedRecords?: ProviderRecord[];
  providerResult?: unknown;
};

export interface SportsbookConnector {
  readonly id: string;
  readonly context: ConnectorContext;
  initialize(): Promise<void>;
  login(): Promise<void>;
  restoreSession(): Promise<void>;
  validateSession(): Promise<boolean>;
  collectEvents(): Promise<ConnectorCollection>;
  collectPrematch(): Promise<ConnectorCollection>;
  collectLive(): Promise<ConnectorCollection>;
  health(): Promise<{ status: HealthStatus; message?: string }>;
  logout(): Promise<void>;
  shutdown(): Promise<void>;
}
