import { altenarEndpoint, extractAltenarRecords, fetchAltenarFeed, isAltenarFeedUrl, type AltenarCapture } from "./altenar.js";
export const WINPOT_NETWORK_PROFILE_VERSION = "winpot-network-v1";
export const WINPOT_ENDPOINT = altenarEndpoint("winpot.mx");
export type WinpotCapture = AltenarCapture;
export const isWinpotFeedUrl = (url: string): boolean => isAltenarFeedUrl(url, "winpot.mx");
export const fetchWinpotFeed = (timeoutMs = 20_000) => fetchAltenarFeed("winpot.mx", timeoutMs);
export const extractWinpotRecords = (captures: WinpotCapture[], collectedAt = new Date().toISOString()) =>
  extractAltenarRecords(captures, { integration: "winpot.mx", sportsbook: "winpot", profileVersion: WINPOT_NETWORK_PROFILE_VERSION }, collectedAt);
