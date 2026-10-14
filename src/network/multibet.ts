import { extractAltenarRecords, fetchAltenarFeed } from "./altenar.js";

export const MULTIBET_NETWORK_PROFILE_VERSION = "multibet-altenar-v1";
export const MULTIBET_INTEGRATION = "multibet.br";

export async function fetchMultibetFeed(timeoutMs = 20_000) {
  return fetchAltenarFeed(MULTIBET_INTEGRATION, timeoutMs, "pt-BR", {
    culture: "pt-BR", countryCode: "BR", timezoneOffset: "180"
  });
}

export function extractMultibetRecords(captures: Array<{ url: string; payload: unknown }>) {
  return extractAltenarRecords(captures, {
    integration: MULTIBET_INTEGRATION,
    sportsbook: "multibet",
    profileVersion: MULTIBET_NETWORK_PROFILE_VERSION
  });
}
