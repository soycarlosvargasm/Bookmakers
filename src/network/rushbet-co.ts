import { fetchKambiFeeds, extractKambiRecords, type RushbetCapture } from "./kambi.js";
export const RUSHBET_CO_NETWORK_PROFILE_VERSION = "rushbet-co-kambi-v1";
export const RUSHBET_CO_ENDPOINTS = [
  "https://us.offering-api.kambicdn.com/offering/v2018/rsico/listView/all.json?lang=es_ES&market=CO&client_id=200&channel_id=1&ncid=1790512792847&useCombined=true",
  "https://us.offering-api.kambicdn.com/offering/v2018/rsico/event/live/open.json?lang=es_ES&market=CO&client_id=200&channel_id=1&ncid=1790512792848"
];
const options = { sportsbook: "rushbet-co", endpoints: RUSHBET_CO_ENDPOINTS, profileVersion: RUSHBET_CO_NETWORK_PROFILE_VERSION };
export const fetchRushbetCoFeeds = (timeoutMs = 20_000) => fetchKambiFeeds(options, timeoutMs);
export const extractRushbetCoRecords = (captures: RushbetCapture[], collectedAt?: string) => extractKambiRecords(captures, options, collectedAt);
