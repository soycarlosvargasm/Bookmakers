import { extractBetB2BRecords, fetchBetB2BDictionaries, fetchBetB2BFeeds, type BetB2BOptions } from "./betb2b.js";

export const ONEXBET_NETWORK_PROFILE_VERSION = "onexbet-betb2b-v1";
export const ONEXBET_BETB2B_OPTIONS: BetB2BOptions = {
  baseUrl: "https://1xbet.co.ke", sportsbook: "1xbet", profileVersion: ONEXBET_NETWORK_PROFILE_VERSION,
  fcountry: "71", gr: "656", ref: "61"
};

export async function fetchOnexbetFeeds(timeoutMs = 20_000) {
  const captures = await fetchBetB2BFeeds(ONEXBET_BETB2B_OPTIONS, timeoutMs);
  const dictionaries = await fetchBetB2BDictionaries(ONEXBET_BETB2B_OPTIONS, captures, timeoutMs);
  return { captures, dictionaries };
}

export function extractOnexbetRecords(feeds: Awaited<ReturnType<typeof fetchOnexbetFeeds>>, collectedAt = new Date().toISOString()) {
  return extractBetB2BRecords(feeds.captures, feeds.dictionaries, ONEXBET_BETB2B_OPTIONS, collectedAt);
}
