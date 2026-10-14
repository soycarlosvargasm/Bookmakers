export const LIVE_STATES = ["prematch", "live", "suspended", "resumed", "closed", "unavailable", "unknown"] as const;
export type LiveState = (typeof LIVE_STATES)[number];

export type RawPayloadInput = {
  sportsbook: string;
  accountAlias: string;
  sourceType: string;
  sourceUrl?: string | null;
  retrievedAt?: string;
  providerTimestamp?: string | null;
  externalEventId?: string | null;
  rawPayload: unknown;
  parserVersion: string;
  /** Observed transport metadata. These fields are evidence, never parser guesses. */
  sourceTopic?: string | null;
  sourceRequestId?: string | null;
  observationDirection?: "sent" | "received" | null;
  payloadSizeBytes?: number | null;
  normalizedRecordCount?: number | null;
};

export type NormalizedRecord = {
  sportsbook: string | null;
  bookmaker?: string | null;
  sport: string | null;
  competition: string | null;
  eventName: string | null;
  participants: string[] | null;
  homeParticipant: string | null;
  awayParticipant: string | null;
  eventStartTime: string | null;
  eventStatus: string | null;
  phase: string | null;
  liveScore: string[] | null;
  liveClock: string | null;
  market: string | null;
  marketPeriod: string | null;
  selection: string | null;
  selectionStatus: string | null;
  line: string | null;
  decimalOdds: number | null;
  rawOdds: string | null;
  rawOddsFormat: string | null;
  sourceEventId: string | null;
  sourceMarketId: string | null;
  sourceSelectionId: string | null;
  sourceUrl: string | null;
  providerTimestamp: string | null;
  collectedAt: string;
  participantPlayer: string | null;
  qualifiers: Record<string, string> | null;
};

export type ProviderRecord = Partial<Omit<NormalizedRecord, "collectedAt">> & {
  collectedAt?: string;
  /** Structured sporting metadata retained in RAW; organizer never guesses countries. */
  sportsMetadata?: import("../ui/sports-organizer.js").SportsMetadata;
};
