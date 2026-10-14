import type { NormalizedRecord } from "./types.js";
import { selectionIdentity } from "./identity.js";

export type OddsObservation = NormalizedRecord & { identity: string; observedAt: string; qualityFlag?: string | null };

export class AppendOnlyOddsHistory {
  private readonly observations: OddsObservation[] = [];
  private readonly latestPrice = new Map<string, number | null>();

  record(record: NormalizedRecord): { kind: "price_change" | "heartbeat"; observation?: OddsObservation } {
    const identity = selectionIdentity(record);
    const previous = this.latestPrice.get(identity);
    const priceChanged = !this.latestPrice.has(identity) || previous !== record.decimalOdds;
    if (!priceChanged) return { kind: "heartbeat" };
    const observation = { ...record, identity, observedAt: record.collectedAt };
    this.latestPrice.set(identity, record.decimalOdds);
    this.observations.push(observation);
    return { kind: "price_change", observation };
  }

  all(): readonly OddsObservation[] { return this.observations; }
}
