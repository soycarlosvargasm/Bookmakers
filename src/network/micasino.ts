import { altenarEndpoint, extractAltenarRecords, fetchAltenarFeed } from "./altenar.js";

export const MICASINO_NETWORK_PROFILE_VERSION = "micasino-altenar-v1";
export const MICASINO_ENDPOINT = altenarEndpoint("micasino.pe", "en-GB", { culture: "en-GB", countryCode: "PE", timezoneOffset: "-420" });
export const fetchMicasinoFeed = (timeoutMs = 20_000) =>
  fetchAltenarFeed("micasino.pe", timeoutMs, "en-GB", { culture: "en-GB", countryCode: "PE", timezoneOffset: "-420" });
export const extractMicasinoRecords = (captures: Array<{ url: string; payload: unknown }>, collectedAt = new Date().toISOString()) =>
  extractAltenarRecords(captures, { integration: "micasino.pe", sportsbook: "micasino", profileVersion: MICASINO_NETWORK_PROFILE_VERSION }, collectedAt);
