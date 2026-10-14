import { extractBetB2B22Records, fetchBetB2B22Feeds, type BetB2BOptions } from "./betb2b.js";

export const MELBET_NETWORK_PROFILE_VERSION = "melbet-betb2b-v1";
export const MELBET_OPTIONS: BetB2BOptions = {
  baseUrl: "https://melbet.com", sportsbook: "melbet", profileVersion: MELBET_NETWORK_PROFILE_VERSION,
  fcountry: "71", gr: "151", ref: "151"
};

export const fetchMelbetFeeds = (timeoutMs = 20_000) => fetchBetB2B22Feeds(MELBET_OPTIONS, timeoutMs);
export const extractMelbetRecords = (captures: Awaited<ReturnType<typeof fetchMelbetFeeds>>, collectedAt = new Date().toISOString()) =>
  extractBetB2B22Records(captures, MELBET_OPTIONS, collectedAt);
