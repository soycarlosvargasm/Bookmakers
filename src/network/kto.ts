import { extractKambiRecords, fetchKambiFeeds } from "./kambi.js";

export const KTO_NETWORK_PROFILE_VERSION = "kto-kambi-v1";
export const KTO_ENDPOINTS = [
  "https://us.offering-api.kambicdn.com/offering/v2018/ktobr/event/live/open.json?lang=pt_BR&market=BR&channel_id=1"
] as const;

const options = { sportsbook: "kto", endpoints: KTO_ENDPOINTS, profileVersion: KTO_NETWORK_PROFILE_VERSION };

export function fetchKtoFeeds(timeoutMs = 20_000) {
  return fetchKambiFeeds(options, timeoutMs);
}

export function extractKtoRecords(captures: Array<{ url: string; payload: unknown }>) {
  return extractKambiRecords(captures, options);
}
