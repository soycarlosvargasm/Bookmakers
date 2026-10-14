import { fetchKambiFeeds, extractKambiRecords, type RushbetCapture } from "./kambi.js";
export const BETPLAY_NETWORK_PROFILE_VERSION = "betplay-kambi-v1";
export const BETPLAY_ENDPOINTS = [
  "https://us.offering-api.kambicdn.com/offering/v2018/betplay/event/live/open.json?lang=es_CO&market=CO&client_id=200&channel_id=1&ncid=1790512857102"
];
const options = { sportsbook: "betplay", endpoints: BETPLAY_ENDPOINTS, profileVersion: BETPLAY_NETWORK_PROFILE_VERSION };
export const fetchBetplayFeeds = (timeoutMs = 20_000) => fetchKambiFeeds(options, timeoutMs);
export const extractBetplayRecords = (captures: RushbetCapture[], collectedAt?: string) => extractKambiRecords(captures, options, collectedAt);
