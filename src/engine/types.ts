import type { Browser, BrowserContext, Page } from "playwright";
import type { ProviderRecord } from "../normalization/types.js";
import type { DomProfile } from "../dom/extractor.js";
import type { AccessibilityProfile } from "../accessibility/extractor.js";
import type { RenzoChromePage } from "./renzo-browser.js";
import type { CollectionRuntime } from "./collection.js";
import type { BetfairCrawlState } from "./betfair-crawler.js";

export type AcquisitionMethod = "http" | "network" | "dom" | "accessibility" | "visual";
export type Source = { url: string; type: string };
export type HandlerConfiguration = {
  headers?: Record<string, string>;
  endpoints?: string[];
  selectors?: Record<string, string>;
  patterns?: Record<string, string>;
  transport?: string;
  profile?: DomProfile;
};
export type ExtractionProfile = {
  version: string;
  domProfile?: DomProfile;
  networkEndpoints?: string[];
  accessibilityProfile?: AccessibilityProfile;
};
export type SessionMemory = {
  path: string | null;
  expiresAt: string | null;
  status: "NONE" | "VALID" | "EXPIRED" | "INVALID";
  updatedAt: string | null;
};
export type SourceMemory = {
  version: 2;
  source: Source;
  method: AcquisitionMethod | null;
  configuration: HandlerConfiguration | null;
  extractionProfile: ExtractionProfile | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastAttemptMethod: AcquisitionMethod | null;
  lastAttemptStatus: "SUCCEEDED" | "MISS" | "ERROR" | "CHALLENGE" | null;
  lastFailureReason: string | null;
  session: SessionMemory;
  requiresHumanIntervention: boolean;
  lastHumanInterventionAt: string | null;
};
export type Evidence = { url: string; transport: string; payload: unknown; capturedAt: string; screenshot?: Buffer; screenshots?: Buffer[] };
export type VisualProgress = { visited: number; pending: number; tabsOpened: number; records: number; ocrCaptures: number; url: string; state: "RUNNING" | "CHALLENGE" | "COMPLETE"; phase?: string; visionCalls?: number; visionQuotes?: number; lastError?: string; updatedAt?: string; competitionsDiscovered?: number; eventsDiscovered?: number; marketViews?: number; failedViews?: number; complete?: boolean };
export type VisualCrawlState = { visited: string[]; pending: string[]; records: ProviderRecord[]; rawPaths: string[]; visits: Array<{ url: string; records: number; method: string; reason?: string }>; tabsOpened: number; ocrCaptures: number };
export type NetworkCapture = {
  url: string;
  transport: string;
  status: number | null;
  contentType: string | null;
  body: string;
  method?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string | null;
};
export type HandlerResult =
  | { kind: "data"; records: ProviderRecord[]; evidence: Evidence; configuration?: HandlerConfiguration; extractionProfile?: ExtractionProfile; validatedPages?: string[]; acquisitionMethod?: AcquisitionMethod }
  | { kind: "miss"; reason: string; sessionInvalid?: boolean }
  | { kind: "challenge"; reason: string; url: string };
export type AcquisitionContext = {
  collection?: CollectionRuntime;
  source: Source;
  memory: SourceMemory | null;
  configuration: HandlerConfiguration | null;
  timeoutMs: number;
  observeMs: number;
  signal?: AbortSignal;
  browserMode?: "isolated" | "renzo";
  keepPersonalPageOpen?: boolean;
  renzoPage?: RenzoChromePage;
  renzoPagePromise?: Promise<RenzoChromePage>;
  closePage?: () => Promise<void>;
  browser?: Browser;
  browserContext?: BrowserContext;
  page?: Page;
  sessionState?: string;
  networkCaptures?: NetworkCapture[];
  accessibilityTree?: unknown;
  exhaustive?: boolean;
  skipReveal?: boolean;
  visualProgress?: (progress: VisualProgress) => void;
  visualPhase?: (phase: string) => void;
  visualCrawl?: VisualCrawlState;
  betfairCrawl?: BetfairCrawlState;
  visualPopupPages?: Page[];
  visualSeed?: { url: string; records: ProviderRecord[]; method: AcquisitionMethod };
  vision?: { calls: number; accepted: number; rejected: number; inputTokens?: number; outputTokens?: number; failures?: number; lastError?: string; disabledReason?: string; responseId?: string };
  savePageCapture?: (method: AcquisitionMethod, result: Extract<HandlerResult, { kind: "data" }>) => Promise<{ records: ProviderRecord[]; rawPath: string }>;
};
export interface Handler {
  readonly method: AcquisitionMethod;
  run(context: AcquisitionContext): Promise<HandlerResult>;
}
export type StageEvent = {
  source: Source;
  method: AcquisitionMethod;
  status: "STARTED" | "MISS" | "SUCCEEDED" | "CHALLENGE" | "ERROR";
  reason?: string;
};
export type InterventionEvent = {
  type: "HUMAN_INTERVENTION_REQUIRED";
  source: Source;
  method: AcquisitionMethod;
  reason: string;
  url: string;
  page?: Page;
};
export type AcquisitionOutcome =
  | { status: "SKIPPED"; source: Source; reason: string; attempts: [] }
  | { status: "SUCCEEDED"; source: Source; method: AcquisitionMethod; records: ProviderRecord[]; rawPath: string; timestamp: string }
  | { status: "FAILED"; source: Source; reason: string; attempts: Array<{ method: AcquisitionMethod; reason: string }> }
  | { status: "PAUSED"; source: Source; event: InterventionEvent; completion: Promise<AcquisitionOutcome>; resume: () => Promise<AcquisitionOutcome>; close: () => Promise<void> };
