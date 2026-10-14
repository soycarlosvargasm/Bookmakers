import { createHash } from "node:crypto";
import { detectOdds } from "../dom/extractor.js";
import type { ProviderRecord } from "../normalization/types.js";

export type AxNode = { id: string; parentId?: string; childIds: string[]; role: string; name: string; ignored: boolean };
export type AccessibilityProfile = { version: string; eventRoles: string[]; marketRoles: string[]; selectionRoles: string[]; requireExplicitSelection: true; rejectIllustrative: true };
export const DEFAULT_ACCESSIBILITY_PROFILE: AccessibilityProfile = { version: "accessibility-v2", eventRoles: ["heading", "link", "group"], marketRoles: ["heading", "group"], selectionRoles: ["button"], requireExplicitSelection: true, rejectIllustrative: true };
export type AxExtraction = { records: ProviderRecord[]; relevantNodes: number; eventCandidates: number; oddsCandidates: number; excludedIllustrative: number; evidence: { role: string; name: string; path: string; reason: string }[] };

const EVENT = /^\s*(.{2,100}?)\s+(?:vs\.?|v\.?|@)\s+(.{2,100}?)\s*$/i;
const MARKET = /^(match winner|moneyline|winner|three.way|1x2|head.to.head)$/i;
const ILLUSTRATIVE = /\b(sample|illustrative|example|hypothetical|for illustration|not actual odds)\b/i;
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

/** Only a named outcome control nested in both an event and a market is accepted.
 * Ordered prices in adjacent cells are intentionally not paired by position. */
export function extractAccessibility(nodes: AxNode[], input: { sourceUrl: string; sportsbook: string; sport: string | null; profile?: AccessibilityProfile; collectedAt?: string }): AxExtraction {
  const profile = input.profile ?? DEFAULT_ACCESSIBILITY_PROFILE;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = (node: AxNode) => node.childIds.map((id) => byId.get(id)).filter((item): item is AxNode => Boolean(item));
  const ancestors = (node: AxNode): AxNode[] => { const out: AxNode[] = []; let parent = node.parentId ? byId.get(node.parentId) : undefined; while (parent && out.length < 18) { out.push(parent); parent = parent.parentId ? byId.get(parent.parentId) : undefined; } return out; };
  const path = (node: AxNode) => [...ancestors(node).reverse().map((item) => item.role), node.role].join("/");
  const visible = nodes.filter((node) => !node.ignored && Boolean(clean(node.name)));
  const eventNodes = visible.filter((node) => profile.eventRoles.includes(node.role) && EVENT.test(clean(node.name)));
  const oddsNodes = visible.filter((node) => ["button", "cell", "link", "StaticText"].includes(node.role) && detectOdds(node.name).length > 0 && (node.role !== "StaticText" || clean(node.name).length < 32));
  const evidence: AxExtraction["evidence"] = [];
  const records: ProviderRecord[] = [];
  let excludedIllustrative = 0;
  for (const node of oddsNodes) {
    if (evidence.length < 40) evidence.push({ role: node.role, name: node.name.slice(0, 200), path: path(node), reason: "odds candidate" });
    if (!profile.selectionRoles.includes(node.role)) continue;
    const odds = detectOdds(node.name);
    if (odds.length !== 1) continue;
    const selection = clean(node.name.replace(odds[0]!.raw, ""));
    if (!selection || selection.length > 100 || detectOdds(selection).length || ILLUSTRATIVE.test(selection)) continue;
    const lineage = ancestors(node);
    if (profile.rejectIllustrative && lineage.some((item) => ILLUSTRATIVE.test(item.name))) { excludedIllustrative++; continue; }
    const marketNode = lineage.find((item) => profile.marketRoles.includes(item.role) && MARKET.test(clean(item.name)));
    const eventNode = lineage.find((item) => profile.eventRoles.includes(item.role) && EVENT.test(clean(item.name)));
    if (!marketNode || !eventNode) continue;
    const match = EVENT.exec(clean(eventNode.name));
    if (!match) continue;
    const participants = [clean(match[1]!), clean(match[2]!)];
    if (!participants.includes(selection) && !/^draw$/i.test(selection)) continue;
    // Named controls and the two named ancestors are the complete provenance.
    const sourceEventId = `accessibility:${createHash("sha256").update(`${input.sourceUrl}|${clean(eventNode.name)}`).digest("hex").slice(0, 24)}`;
    records.push({ sportsbook: input.sportsbook, sport: input.sport, competition: null, eventName: `${participants[0]} vs ${participants[1]}`, participants, homeParticipant: participants[0], awayParticipant: participants[1], eventStatus: null, market: clean(marketNode.name), selection, rawOdds: odds[0]!.raw, rawOddsFormat: odds[0]!.format, decimalOdds: odds[0]!.decimal, sourceEventId, sourceUrl: input.sourceUrl, collectedAt: input.collectedAt ?? new Date().toISOString(), qualifiers: null });
    if (evidence.length < 40) evidence.push({ role: node.role, name: `${eventNode.name} | ${marketNode.name} | ${node.name}`.slice(0, 200), path: path(node), reason: "complete semantic ancestry" });
  }
  const unique = [...new Map(records.map((record) => [`${record.sourceEventId}|${record.market}|${record.selection}|${record.rawOdds}`, record])).values()];
  return { records: unique, relevantNodes: visible.filter((node) => ["button", "heading", "link", "table", "row", "cell", "group", "listitem"].includes(node.role)).length, eventCandidates: eventNodes.length, oddsCandidates: oddsNodes.length, excludedIllustrative, evidence };
}
