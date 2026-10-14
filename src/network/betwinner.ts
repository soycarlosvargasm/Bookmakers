import { extractBetB2B22Records, fetchBetB2B22Feeds, type BetB2BOptions } from "./betb2b.js";

export const BETWINNER_NETWORK_PROFILE_VERSION = "betwinner-betb2b-v1";
export const BETWINNER_OPTIONS: BetB2BOptions = {
  baseUrl: "https://betwinner.com", sportsbook: "betwinner", profileVersion: BETWINNER_NETWORK_PROFILE_VERSION,
  fcountry: "71", gr: "151", ref: "151"
};

export const fetchBetwinnerFeeds = (timeoutMs = 20_000) => fetchBetB2B22Feeds(BETWINNER_OPTIONS, timeoutMs);
export const extractBetwinnerRecords = (captures: Awaited<ReturnType<typeof fetchBetwinnerFeeds>>, collectedAt = new Date().toISOString()) =>
  extractBetB2B22Records(captures, BETWINNER_OPTIONS, collectedAt);
