import { usableRecord } from "../validation/records.js";
import { readFile } from "node:fs/promises";
import type { NormalizedRecord, ProviderRecord } from "../normalization/types.js";
import { normalizeRecord } from "../normalization/normalize.js";
import { extractKambiRecords } from "../network/kambi.js";
import { extractAltenarRecords } from "../network/altenar.js";
import { extractBetB2BRecords, extractBetB2B22Records, type BetB2BCapture, type BetB2BDictionary } from "../network/betb2b.js";
import { extractPinnacleRecords } from "../network/pinnacle.js";
import { extractBetssonRecords } from "../network/betsson.js";
import { extractCodereRecords } from "../network/codere.js";
import { extractBetwayRecords } from "../network/betway.js";
import { extractTencricRecords } from "../network/tencric.js";
import { extractBet9jaRecords } from "../network/bet9ja.js";

export class UnsupportedSnapshotError extends Error {}

export type RawSnapshot = {
  source: { url: string; type: string };
  method: string;
  retrievedAt: string;
  recordCount: number;
  evidence: { url: string; transport: string; payload: unknown; capturedAt: string };
};

type Capture = { url: string; payload: unknown; mode?: "sports" | "prematch" | "line" | "live"; status?: number; contentType?: string | null; body?: string };

const KAMBI_TYPES = new Set(["kto", "rushbet-co", "betplay", "rushbet"]);
const ALTENAR_TYPES = new Set(["winpot", "playdoit", "palmsbet", "brasildasorte", "multibet"]);
const BETB2B22_TYPES = new Set(["22bet", "melbet", "betwinner"]);

export async function readRawSnapshot(path: string): Promise<RawSnapshot> {
  return JSON.parse(await readFile(path, "utf8")) as RawSnapshot;
}

export function extractSnapshotRecords(snapshot: RawSnapshot): NormalizedRecord[] {
  const payload = snapshot.evidence?.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new UnsupportedSnapshotError("evidence.payload missing or invalid");
  const at = snapshot.retrievedAt;
  const type = snapshot.source?.type;
  if (!type) throw new UnsupportedSnapshotError("source.type missing");

  const normalize = (records: ProviderRecord[]): NormalizedRecord[] => records.filter(record => usableRecord(record,snapshot.evidence.url)).map(record => normalizeRecord({ ...record, collectedAt: record.collectedAt ?? at }, at));

  const captures = Array.isArray(payload.captures) ? payload.captures as Capture[] : [];
  // Engine RAWs usually contain records. Two captures contain more priced records
  // than their bounded records[] copy, so recover the complete captured feed.
  if (Array.isArray(payload.records)) {
    const stored = payload.records as ProviderRecord[];
    if (stored.length >= snapshot.recordCount) return normalize(stored);
    const collectedAt = stored[0]?.collectedAt ?? at;
    let recovered: ProviderRecord[];
    if (KAMBI_TYPES.has(type)) {
      recovered = extractKambiRecords(captures, {
        sportsbook: type, endpoints: captures.map(capture => capture.url),
        profileVersion: typeof payload.profileVersion === "string" ? payload.profileVersion : `${type}-kambi-v1`,
      }, collectedAt);
    } else if (type === "bet9ja") {
      recovered = extractBet9jaRecords(captures.map(capture => ({
        mode: capture.mode === "prematch" || capture.mode === "live" ? capture.mode : "sports",
        url: capture.url, payload: capture.payload,
      }))).map(record => ({ ...record, collectedAt }));
    } else {
      throw new UnsupportedSnapshotError(`Truncated records without recovery for source.type=${type}`);
    }
    if (recovered.length !== snapshot.recordCount) throw new UnsupportedSnapshotError(`Recovered ${recovered.length} of ${snapshot.recordCount} records for source.type=${type}`);
    return normalize(recovered);
  }

  if (KAMBI_TYPES.has(type)) {
    return normalize(extractKambiRecords(captures, {
      sportsbook: type,
      endpoints: captures.map(capture => capture.url),
      profileVersion: typeof payload.profileVersion === "string" ? payload.profileVersion : `${type}-kambi-v1`,
    }, at));
  }

  if (ALTENAR_TYPES.has(type)) {
    const integration = captures[0]?.url ? new URL(captures[0].url).searchParams.get("integration") ?? type : type;
    return normalize(extractAltenarRecords(captures, { integration, sportsbook: type }, at));
  }

  if (BETB2B22_TYPES.has(type)) {
    return normalize(extractBetB2B22Records(captures as BetB2BCapture[], {
      baseUrl: `https://${type}.com/`, sportsbook: type,
      profileVersion: typeof payload.profileVersion === "string" ? payload.profileVersion : `${type}-betb2b-v1`,
      fcountry: "", gr: "", ref: "",
    }, at));
  }

  switch (type) {
    case "1xbet": {
      const dictionaries = new Map<string, BetB2BDictionary>();
      if (Array.isArray(payload.dictionaries)) for (const entry of payload.dictionaries) {
        if (entry && typeof entry === "object" && typeof entry.type === "string") dictionaries.set(entry.type, entry as BetB2BDictionary);
      }
      return normalize(extractBetB2BRecords(captures as BetB2BCapture[], dictionaries, {
        baseUrl: "https://1xbet.co.ke/", sportsbook: "1xbet",
        profileVersion: typeof payload.profileVersion === "string" ? payload.profileVersion : "1xbet-betb2b-v1",
        fcountry: "", gr: "", ref: "",
      }, at));
    }
    case "pinnacle": return normalize(extractPinnacleRecords(captures, at));
    case "betsson": return normalize(extractBetssonRecords(captures, at));
    case "codere": return normalize(extractCodereRecords(captures, at));
    case "betway": {
      const first = captures[0];
      return first && Array.isArray(first.payload) ? normalize(extractBetwayRecords(first.payload, first.url, at)) : [];
    }
    case "10cric": return normalize(extractTencricRecords(payload.response, snapshot.evidence.url));
    case "bet9ja": return normalize(extractBet9jaRecords(captures.map(capture => ({
      mode: capture.mode === "prematch" || capture.mode === "live" ? capture.mode : "sports",
      url: capture.url, payload: capture.payload,
    }))));
    default: throw new UnsupportedSnapshotError(`No reader registered for source.type=${type}`);
  }
}
