import { altenarEndpoint, extractAltenarRecords, fetchAltenarFeed } from "./altenar.js";

export const PALMSBET_NETWORK_PROFILE_VERSION = "palmsbet-altenar-v1";
export const PALMSBET_ENDPOINT = altenarEndpoint("palmsbet.pe", "en-GB", { culture: "es-ES", countryCode: "PE", timezoneOffset: "-420" });
export const fetchPalmsbetFeed = (timeoutMs = 20_000) =>
  fetchAltenarFeed("palmsbet.pe", timeoutMs, "en-GB", { culture: "es-ES", countryCode: "PE", timezoneOffset: "-420" });
export const extractPalmsbetRecords = (captures: Array<{ url: string; payload: unknown }>, collectedAt = new Date().toISOString()) =>
  extractAltenarRecords(captures, { integration: "palmsbet.pe", sportsbook: "palmsbet", profileVersion: PALMSBET_NETWORK_PROFILE_VERSION }, collectedAt);
