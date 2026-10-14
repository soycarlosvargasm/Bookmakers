import { extractBetB2B22Records, fetchBetB2B22Feeds, type BetB2BOptions } from "./betb2b.js";

export const TWENTYTWO_BET_NETWORK_PROFILE_VERSION = "22bet-betb2b-v1";
export const TWENTYTWO_BET_OPTIONS: BetB2BOptions = {
  baseUrl: "https://22match.com", sportsbook: "22bet", profileVersion: TWENTYTWO_BET_NETWORK_PROFILE_VERSION,
  fcountry: "71", gr: "151", ref: "151"
};

export const fetch22betFeeds = (timeoutMs = 20_000) => fetchBetB2B22Feeds(TWENTYTWO_BET_OPTIONS, timeoutMs);
export const extract22betRecords = (captures: Awaited<ReturnType<typeof fetch22betFeeds>>, collectedAt = new Date().toISOString()) =>
  extractBetB2B22Records(captures, TWENTYTWO_BET_OPTIONS, collectedAt);
