import { extractAltenarRecords, fetchAltenarFeed } from "./altenar.js";

export const BRASILDASORTE_NETWORK_PROFILE_VERSION = "brasildasorte-altenar-v1";
export const BRASILDASORTE_INTEGRATION = "brasildasorte";

export async function fetchBrasilDaSorteFeed(timeoutMs = 20_000) {
  return fetchAltenarFeed(BRASILDASORTE_INTEGRATION, timeoutMs, "pt-BR", {
    culture: "pt-BR", countryCode: "BR", timezoneOffset: "180"
  });
}

export function extractBrasilDaSorteRecords(captures: Array<{ url: string; payload: unknown }>) {
  return extractAltenarRecords(captures, {
    integration: BRASILDASORTE_INTEGRATION,
    sportsbook: "brasildasorte",
    profileVersion: BRASILDASORTE_NETWORK_PROFILE_VERSION
  });
}
