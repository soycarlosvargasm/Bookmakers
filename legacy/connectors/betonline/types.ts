import type { BrowserNetworkDiagnostics, NetworkDiagnostic, NetworkProbeResult } from "../../browser/diagnostics.js";

export type BetOnlineNetworkReport = {
  checkedAt: string;
  pageUrl: string;
  probes: NetworkProbeResult[];
  entries: NetworkDiagnostic[];
  classification: string[];
};

export type BetOnlineConnectorOptions = {
  browserManager: import("../../browser/manager.js").BrowserManager;
  accountAlias?: string;
  baseUrl?: string;
  waitForTrafficMs?: number;
  refreshBeforeCollect?: boolean;
};

export type BetOnlineDiagnosticsOptions = {
  durationMs?: number;
  reload?: boolean;
};

export type BetOnlineDiagnosticRunner = BrowserNetworkDiagnostics;
