import type { PoolClient } from "pg";

export const MATCH_STATUSES = ["MATCHED", "AMBIGUOUS", "UNMATCHED", "CONFLICT"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

type SourceEvent = {
  id: number; sportsbook: string; sourceEventId: string; sport: string | null; competition: string | null;
  eventName: string | null; participants: string[] | null; home: string | null; away: string | null;
  startTime: string | null; status: string | null;
};
type SourceMarket = {
  id: number; eventId: number; sportsbook: string; canonicalEventId: number; market: string | null;
  period: string | null; player: string | null; home: string | null; away: string | null; status: string | null;
};
type SourceSelection = SourceMarket & { selectionId: number; selection: string | null; line: string | null };
type EventEvidence = { method: string; confidence: number; reasons: Record<string, unknown> };
type SemanticMarket = { family: string; typeKey: string; subjectKind: string; subjectKey: string | null; periodKey: string; ambiguous: boolean };
type SemanticSelection = { selectionKey: string; lineKey: string | null; ambiguous: boolean };
type Decision = { canonicalId: number | null; status: MatchStatus; method: string; confidence: number; sources: string[]; evidence: Record<string, unknown> };

const noise = new Set(["fc", "cf", "afc", "sc", "ac", "bc", "club", "the"]);
const compact = (value: string | null | undefined): string => (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
export const stableName = (value: string | null | undefined): string => compact(value).split(" ").filter((part) => !noise.has(part)).join(" ");
const sportKey = (value: string | null): string => stableName(value);
/** Competition codes disambiguate provider labels such as football/NFL and hockey/NHL. */
const eventSportKey = (event: Pick<SourceEvent, "sport" | "competition">): string => {
  const competition = stableName(event.competition);
  if (["nfl", "ncaaf"].includes(competition)) return "american_football";
  if (["nhl", "ahl"].includes(competition)) return "ice_hockey";
  if (["nba", "wnba", "ncaab"].includes(competition)) return "basketball";
  if (competition === "mlb") return "baseball";
  return sportKey(event.sport);
};
const unique = <T>(items: T[]): T[] => [...new Set(items)];
const containsWholePhrase = (text: string, phrase: string): boolean => {
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(text);
};
const sourceNamespace = (source: string): string => /^(actionnetwork|bfo|fightodds)-/.test(source) ? source.split("-", 1)[0]! : source;
const lifecycle = (status: string | null): "LIVE" | "PREMATCH" | "OTHER" => /live|inprogress|in progress|in_play|inplay/i.test(status ?? "") ? "LIVE" : /pre|scheduled|upcoming/i.test(status ?? "") ? "PREMATCH" : "OTHER";
const sourceParticipants = (event: SourceEvent): [string, string] | null => {
  if (event.home && event.away) return [event.home, event.away];
  if (event.participants?.length === 2) return [event.participants[1]!, event.participants[0]!];
  const parts = (event.eventName ?? "").split(/\s+(?:@|vs?\.?|v\.)\s+/i).map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? [parts[1]!, parts[0]!] : null;
};
const eventPairKey = (event: SourceEvent): string | null => {
  const pair = sourceParticipants(event); if (!pair) return null;
  const values = pair.map(stableName); return values.every(Boolean) ? values.sort().join("|") : null;
};
const samePair = (left: SourceEvent, right: SourceEvent): boolean => eventPairKey(left) !== null && eventPairKey(left) === eventPairKey(right);
const sameOrientation = (left: SourceEvent, right: SourceEvent): boolean => !left.home || !left.away || !right.home || !right.away || (stableName(left.home) === stableName(right.home) && stableName(left.away) === stableName(right.away));
const startDistanceMinutes = (left: SourceEvent, right: SourceEvent): number | null => left.startTime && right.startTime ? Math.abs(Date.parse(left.startTime) - Date.parse(right.startTime)) / 60_000 : null;

/** Pure and deliberately strict: a rejected comparison never becomes a fuzzy match. */
export const compareEvents = (left: SourceEvent, right: SourceEvent): EventEvidence | null => {
  if (left.id === right.id || left.sportsbook === right.sportsbook) return null;
  const leftSport = eventSportKey(left); const rightSport = eventSportKey(right);
  const sameNamespaceId = sourceNamespace(left.sportsbook) === sourceNamespace(right.sportsbook) && left.sourceEventId === right.sourceEventId;
  if (leftSport && rightSport && leftSport !== rightSport) return null;
  const leftCompetition = stableName(left.competition); const rightCompetition = stableName(right.competition);
  if (sameNamespaceId) {
    // A namespace ID is authoritative only until supplied semantics contradict it.
    if ((leftCompetition && rightCompetition && leftCompetition !== rightCompetition) || (eventPairKey(left) && eventPairKey(right) && !samePair(left, right))) return null;
    return { method: "EXTERNAL_ID_NAMESPACE", confidence: 0.995, reasons: { sourceNamespace: sourceNamespace(left.sportsbook), externalEventId: left.sourceEventId, sport: leftSport || null, competition: leftCompetition || rightCompetition || null } };
  }
  if (!leftSport || !rightSport || leftSport !== rightSport || !samePair(left, right) || !sameOrientation(left, right)) return null;
  if (leftCompetition && rightCompetition && leftCompetition !== rightCompetition) return null;
  const minutes = startDistanceMinutes(left, right);
  if (minutes !== null && minutes > 180) return null;
  const leftLifecycle = lifecycle(left.status); const rightLifecycle = lifecycle(right.status);
  // Status is timing evidence, not identity. Stale source projections may be
  // prematch while another source has correctly moved to live.
  if (leftLifecycle !== "OTHER" && rightLifecycle !== "OTHER" && leftLifecycle !== rightLifecycle && minutes === null) return null;
  // Without an ID, a pair must have either competition or time evidence in addition to sport + participants.
  if (!leftCompetition && !rightCompetition && minutes === null) return null;
  const method = minutes === null ? "SPORT_COMPETITION_PARTICIPANTS" : "SPORT_COMPETITION_PARTICIPANTS_TIME";
  return { method, confidence: minutes === null ? 0.93 : (leftLifecycle !== "OTHER" && rightLifecycle !== "OTHER" && leftLifecycle !== rightLifecycle ? 0.95 : 0.97), reasons: { sport: leftSport, competition: leftCompetition || rightCompetition || null, participantPair: eventPairKey(left), homeAway: Boolean(left.home && left.away && right.home && right.away), startDeltaMinutes: minutes, lifecycle: leftLifecycle === "OTHER" ? rightLifecycle : leftLifecycle, lifecycleConflict: leftLifecycle !== "OTHER" && rightLifecycle !== "OTHER" && leftLifecycle !== rightLifecycle } };
};

class UnionFind {
  private readonly parent = new Map<number, number>();
  constructor(items: number[]) { for (const item of items) this.parent.set(item, item); }
  find(item: number): number { const parent = this.parent.get(item) ?? item; if (parent === item) return item; const root = this.find(parent); this.parent.set(item, root); return root; }
  union(left: number, right: number): void { const a = this.find(left); const b = this.find(right); if (a !== b) this.parent.set(Math.max(a, b), Math.min(a, b)); }
}

const slug = (value: string | null | undefined): string => stableName(value).replace(/ /g, "_");
const normalizedLine = (line: string | null): string | null => {
  if (!line) return null;
  const text = line.replace(/½/g, ".5").replace(/¼/g, ".25").replace(/¾/g, ".75").replace(/(\d+)\s+1\/2\b/g, "$1.5").replace(/(\d+)\s+1\/4\b/g, "$1.25").replace(/(\d+)\s+3\/4\b/g, "$1.75").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text); return Number.isFinite(number) ? String(number) : null;
};
const periodKey = (period: string | null): string => {
  const key = compact(period);
  if (!key || key === "game" || key === "full game" || key === "unknown" || key === "match") return "FULL_GAME";
  if (/^(first|1st) half$|^1h$/.test(key)) return "H1";
  if (/^(second|2nd) half$|^2h$/.test(key)) return "H2";
  const quarter = /^(?:quarter|q)\s*([1-9])$/.exec(key); if (quarter) return `Q${quarter[1]}`;
  const periodMatch = /^(?:period|p)\s*([1-9])$/.exec(key); if (periodMatch) return `P${periodMatch[1]}`;
  return slug(period);
};
export const semanticMarket = (record: Pick<SourceMarket, "market" | "period" | "player" | "home" | "away">): SemanticMarket => {
  const raw = compact(record.market); const key = slug(record.market); const player = stableName(record.player);
  const teamTotal = /team (?:total|score)/.test(raw); const playerProp = Boolean(player) || /player|athlete/.test(raw);
  let family = "OTHER"; let typeKey = key || "unknown"; let subjectKind = "EVENT"; let subjectKey: string | null = null;
  if (/money\s*line|moneyline|match winner|winner/.test(raw)) { family = "MONEYLINE"; typeKey = "moneyline"; }
  else if (/spread|handicap|run line|puck line/.test(raw)) { family = "SPREAD"; typeKey = "spread"; }
  else if (teamTotal) { family = "TEAM_TOTAL"; const remainder = raw.replace(/team (?:total|score)/g, "").trim(); typeKey = remainder ? `team_total_${slug(remainder)}` : "team_total"; subjectKind = "TEAM"; const named = [record.home, record.away].find((name) => containsWholePhrase(raw, stableName(name))); subjectKey = named ? stableName(named) : null; }
  else if (/odd even.*total|total.*odd even/.test(raw)) { family = "EVENT_PROP"; typeKey = "total_odd_even"; }
  else if (/exact.*total|total.*exact/.test(raw)) { family = "EVENT_PROP"; typeKey = "total_exact"; }
  else if (/range.*total|total.*range|bands?/.test(raw)) { family = "EVENT_PROP"; typeKey = /bands?/.test(raw) ? "total_bands" : "total_range"; }
  else if (/mma prop/.test(raw)) { family = "EVENT_PROP"; typeKey = key || "mma_prop"; }
  else if (/total|over under|o u/.test(raw)) { family = "TOTAL"; typeKey = raw.includes("goal") ? "total_goals" : raw.includes("round") ? "total_rounds" : "total"; }
  else if (playerProp) { family = "PLAYER_PROP"; typeKey = `player_prop_${key || "unknown"}`; subjectKind = "PLAYER"; subjectKey = player || null; }
  const ambiguous = !key || (family === "TEAM_TOTAL" && !subjectKey) || (family === "PLAYER_PROP" && !subjectKey);
  return { family, typeKey, subjectKind, subjectKey, periodKey: periodKey(record.period), ambiguous };
};
export const semanticSelection = (record: Pick<SourceSelection, "selection" | "line" | "home" | "away">, market: SemanticMarket): SemanticSelection => {
  const selection = compact(record.selection); const home = stableName(record.home); const away = stableName(record.away);
  let selectionKey = selection ? `LABEL:${slug(record.selection)}` : "UNKNOWN";
  if (/^(over|o)(?:\s|$)/.test(selection)) selectionKey = "OVER";
  else if (/^(under|u)(?:\s|$)/.test(selection)) selectionKey = "UNDER";
  else if (/^(draw|tie|x)(?:\s|$)/.test(selection)) selectionKey = "DRAW";
  else if (/^(home|h)(?:\s|$)/.test(selection)) selectionKey = "HOME";
  else if (/^(away|a)(?:\s|$)/.test(selection)) selectionKey = "AWAY";
  else if (home && selection === home) selectionKey = "HOME";
  else if (away && selection === away) selectionKey = "AWAY";
  else {
    // Some providers repeat the period in a team selection ("Dodgers - 1H").
    const teamPrefix = stableName((record.selection ?? "").replace(/\s+-\s+(?:l?\d+[hip]|\d+(?:st|nd|rd|th)\s+(?:inning|half))$/i, ""));
    if (home && teamPrefix === home) selectionKey = "HOME";
    else if (away && teamPrefix === away) selectionKey = "AWAY";
    else if (market.family === "SPREAD") {
      const withoutSpread = stableName((record.selection ?? "").replace(/\s+[+-]?\d+(?:\.\d+)?\s*$/u, ""));
      if (home && withoutSpread === home) selectionKey = "HOME";
      else if (away && withoutSpread === away) selectionKey = "AWAY";
    }
  }
  // Some APIs place the line in the displayed selection ("Over 2½" or
  // "Team A -1.5") instead of the dedicated line field. Extract only a
  // terminal numeric token, never arbitrary numbers from proposition labels.
  const embeddedLine = /(?:^|\s)([+-]?\d+(?:\.\d+)?|[+-]?\d+[½¼¾])\s*$/u.exec((record.selection ?? "").trim())?.[1] ?? null;
  const lineKey = normalizedLine(record.line) ?? normalizedLine(embeddedLine);
  const requiresLine = market.family === "SPREAD" || market.family === "TOTAL" || market.family === "TEAM_TOTAL";
  const sideRequired = ["MONEYLINE", "SPREAD", "TOTAL", "TEAM_TOTAL"].includes(market.family);
  const ambiguous = market.ambiguous || selectionKey === "UNKNOWN" || (requiresLine && lineKey === null) || (sideRequired && selectionKey.startsWith("LABEL:"));
  return { selectionKey, lineKey, ambiguous };
};

const marketIdentity = (semantic: SemanticMarket): string => JSON.stringify([semantic.family, semantic.typeKey, semantic.subjectKind, semantic.subjectKey, semantic.periodKey]);
const selectionIdentity = (semantic: SemanticSelection): string => JSON.stringify([semantic.selectionKey, semantic.lineKey]);
const asEvents = (rows: Record<string, unknown>[]): SourceEvent[] => rows.map((row) => ({ id: Number(row.id), sportsbook: String(row.sportsbook), sourceEventId: String(row.source_event_id), sport: row.sport as string | null, competition: row.competition as string | null, eventName: row.event_name as string | null, participants: row.participants as string[] | null, home: row.home_participant as string | null, away: row.away_participant as string | null, startTime: row.event_start_time ? new Date(row.event_start_time as string).toISOString() : null, status: row.event_status as string | null }));

async function writeDecision(client: PoolClient, kind: "event" | "market" | "selection", sourceId: number, decision: Decision): Promise<void> {
  const table = `${kind}_matches`; const history = `${kind}_match_decisions`; const idColumn = `${kind}_id`; const canonicalColumn = `canonical_${kind}_id`;
  const sourceJson = JSON.stringify(decision.sources); const evidenceJson = JSON.stringify(decision.evidence);
  const existing = await client.query(`SELECT ${canonicalColumn},status,match_method,confidence::text,sources,evidence FROM ${table} WHERE ${idColumn}=$1`, [sourceId]);
  const previous = existing.rows[0];
  const changed = !previous || Number(previous[canonicalColumn]) !== decision.canonicalId || previous.status !== decision.status || previous.match_method !== decision.method || Number(previous.confidence) !== decision.confidence || JSON.stringify(previous.sources) !== sourceJson || JSON.stringify(previous.evidence) !== evidenceJson;
  await client.query(`INSERT INTO ${table}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) ON CONFLICT(${idColumn}) DO UPDATE SET ${canonicalColumn}=EXCLUDED.${canonicalColumn},status=EXCLUDED.status,match_method=EXCLUDED.match_method,confidence=EXCLUDED.confidence,sources=EXCLUDED.sources,evidence=EXCLUDED.evidence,evaluated_at=now()`, [sourceId, decision.canonicalId, decision.status, decision.method, decision.confidence, sourceJson, evidenceJson]);
  if (changed) await client.query(`INSERT INTO ${history}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [sourceId, decision.canonicalId, decision.status, decision.method, decision.confidence, sourceJson, evidenceJson]);
}

async function writeDecisionBatch(client: PoolClient, kind: "event" | "market" | "selection", decisions: Array<{ sourceId: number; decision: Decision }>): Promise<void> {
  const table = `${kind}_matches`; const history = `${kind}_match_decisions`; const idColumn = `${kind}_id`; const canonicalColumn = `canonical_${kind}_id`;
  for (let offset = 0; offset < decisions.length; offset += 2_000) {
    const chunk = decisions.slice(offset, offset + 2_000).map(({ sourceId, decision }) => ({ source_id: sourceId, canonical_id: decision.canonicalId, status: decision.status, method: decision.method, confidence: decision.confidence, sources: decision.sources, evidence: decision.evidence }));
    const payload = JSON.stringify(chunk);
    const records = `jsonb_to_recordset($1::jsonb) AS x(source_id bigint,canonical_id bigint,status text,method text,confidence numeric,sources jsonb,evidence jsonb)`;
    await client.query(`INSERT INTO ${history}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence)
      SELECT x.source_id,x.canonical_id,x.status,x.method,x.confidence,x.sources,x.evidence FROM ${records}
      LEFT JOIN ${table} current ON current.${idColumn}=x.source_id
      WHERE current.${idColumn} IS NULL OR ROW(current.${canonicalColumn},current.status,current.match_method,current.confidence,current.sources,current.evidence) IS DISTINCT FROM ROW(x.canonical_id,x.status,x.method,x.confidence,x.sources,x.evidence)`, [payload]);
    await client.query(`INSERT INTO ${table}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence)
      SELECT x.source_id,x.canonical_id,x.status,x.method,x.confidence,x.sources,x.evidence FROM ${records}
      ON CONFLICT(${idColumn}) DO UPDATE SET ${canonicalColumn}=EXCLUDED.${canonicalColumn},status=EXCLUDED.status,match_method=EXCLUDED.match_method,confidence=EXCLUDED.confidence,sources=EXCLUDED.sources,evidence=EXCLUDED.evidence,evaluated_at=now()`, [payload]);
  }
}

async function ensureCanonicalEvent(client: PoolClient, id: number, event: SourceEvent): Promise<void> {
  const sport = eventSportKey(event) || "unknown";
  const competitionKey = stableName(event.competition);
  let competitionId: number | null = null;
  if (competitionKey) {
    const inserted = await client.query<{ id: number }>(`INSERT INTO canonical_competitions(sport_key,canonical_key,display_name) VALUES($1,$2,$3) ON CONFLICT(sport_key,canonical_key) DO UPDATE SET display_name=canonical_competitions.display_name RETURNING id`, [sport, competitionKey, event.competition]);
    competitionId = inserted.rows[0]!.id;
    await client.query(`INSERT INTO competition_aliases(sport_key,alias_key,canonical_competition_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [sport, compact(event.competition), competitionId, sourceNamespace(event.sportsbook), event.competition]);
  }
  const participantId = async (name: string | null): Promise<number | null> => {
    const key = stableName(name); if (!key || !name) return null;
    const inserted = await client.query<{ id: number }>(`INSERT INTO canonical_participants(sport_key,canonical_key,display_name) VALUES($1,$2,$3) ON CONFLICT(sport_key,canonical_key) DO UPDATE SET display_name=canonical_participants.display_name RETURNING id`, [sport, key, name]);
    const participant = inserted.rows[0]!.id;
    await client.query(`INSERT INTO participant_aliases(sport_key,alias_key,canonical_participant_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [sport, compact(name), participant, sourceNamespace(event.sportsbook), name]);
    return participant;
  };
  const homeId = await participantId(event.home); const awayId = await participantId(event.away);
  await client.query(`INSERT INTO canonical_events(id,sport_key,canonical_competition_id,home_participant_id,away_participant_id,event_start_time,lifecycle_bucket) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET sport_key=EXCLUDED.sport_key`, [id, sport, competitionId, homeId, awayId, event.startTime, lifecycle(event.status)]);
}

async function hydrateConfirmedAliases(client: PoolClient, source: SourceEvent[]): Promise<SourceEvent[]> {
  const participants = await client.query(`SELECT a.sport_key,a.alias_key,p.canonical_key FROM participant_aliases a JOIN canonical_participants p ON p.id=a.canonical_participant_id`);
  const competitions = await client.query(`SELECT a.sport_key,a.alias_key,c.canonical_key FROM competition_aliases a JOIN canonical_competitions c ON c.id=a.canonical_competition_id`);
  const participantMap = new Map(participants.rows.map((row) => [`${row.sport_key}\u0000${row.alias_key}`, String(row.canonical_key)]));
  const competitionMap = new Map(competitions.rows.map((row) => [`${row.sport_key}\u0000${row.alias_key}`, String(row.canonical_key)]));
  return source.map((event) => {
    const sport = eventSportKey(event);
    const resolveParticipant = (name: string | null): string | null => name ? participantMap.get(`${sport}\u0000${compact(name)}`) ?? name : null;
    return { ...event, competition: event.competition ? competitionMap.get(`${sport}\u0000${compact(event.competition)}`) ?? event.competition : null,
      home: resolveParticipant(event.home), away: resolveParticipant(event.away), participants: event.participants?.map((name) => resolveParticipant(name) ?? name) ?? null };
  });
}

async function persistConfirmedAliases(client: PoolClient, canonicalEventId: number, event: SourceEvent): Promise<void> {
  const canonical = await client.query(`SELECT sport_key,canonical_competition_id,home_participant_id,away_participant_id FROM canonical_events WHERE id=$1`, [canonicalEventId]);
  const row = canonical.rows[0]; if (!row) return;
  const source = sourceNamespace(event.sportsbook);
  if (event.competition && row.canonical_competition_id) await client.query(`INSERT INTO competition_aliases(sport_key,alias_key,canonical_competition_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [row.sport_key, compact(event.competition), row.canonical_competition_id, source, event.competition]);
  for (const [name, participantId] of [[event.home, row.home_participant_id], [event.away, row.away_participant_id]] as const) {
    if (name && participantId) await client.query(`INSERT INTO participant_aliases(sport_key,alias_key,canonical_participant_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [row.sport_key, compact(name), participantId, source, name]);
  }
}

async function reconcileEvents(client: PoolClient, requested: Set<number> | null): Promise<Set<number>> {
  if (requested?.size === 0) return requested;
  const result = await client.query(`SELECT e.id,b.key AS sportsbook,e.source_event_id,e.sport,e.competition,e.event_name,e.participants,e.home_participant,e.away_participant,e.event_start_time,e.event_status FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id ORDER BY e.id`);
  const rawEvents = asEvents(result.rows); const events = await hydrateConfirmedAliases(client, rawEvents);
  const rawById = new Map(rawEvents.map((event) => [event.id, event])); const byId = new Map(events.map((event) => [event.id, event])); const union = new UnionFind(events.map((event) => event.id));
  const byExternal = new Map<string, SourceEvent[]>(); const byPair = new Map<string, SourceEvent[]>();
  const eventDecisions: Array<{ sourceId: number; decision: Decision }> = [];
  for (const event of events) {
    const external = `${sourceNamespace(event.sportsbook)}\u0000${event.sourceEventId}`; byExternal.set(external, [...(byExternal.get(external) ?? []), event]);
    const pair = eventPairKey(event); if (pair && eventSportKey(event)) { const key = `${eventSportKey(event)}\u0000${pair}`; byPair.set(key, [...(byPair.get(key) ?? []), event]); }
  }
  const conflicts = new Map<number, Record<string, unknown>[]>();
  for (const members of byExternal.values()) for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    const evidence = compareEvents(members[i]!, members[j]!);
    if (evidence?.method === "EXTERNAL_ID_NAMESPACE") union.union(members[i]!.id, members[j]!.id);
    else {
      const reason = { kind: "EXTERNAL_ID_SEMANTIC_CONTRADICTION", sourceNamespace: sourceNamespace(members[i]!.sportsbook), externalEventId: members[i]!.sourceEventId, leftEventId: members[i]!.id, rightEventId: members[j]!.id };
      conflicts.set(members[i]!.id, [...(conflicts.get(members[i]!.id) ?? []), reason]); conflicts.set(members[j]!.id, [...(conflicts.get(members[j]!.id) ?? []), reason]);
      // A reused provider ID is no longer authoritative. Remove only the
      // derived canonical lookup, never any source row or observation.
      await client.query(`DELETE FROM canonical_event_external_ids WHERE source_namespace=$1 AND external_event_id=$2`, [sourceNamespace(members[i]!.sportsbook), members[i]!.sourceEventId]);
    }
  }
  // Transitive closure over semantic edges within each participant-pair group.
  // If A matches B and B matches C, all three belong to the same event family,
  // even when A and C are never directly compared. This is order-independent,
  // unlike a single-pass fold that only merges events with one pre-existing
  // component. compareEvents remains strict, so edges reflect real compatibility.
  for (const members of byPair.values()) for (let leftIndex = 0; leftIndex < members.length; leftIndex++) for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex++) {
    const left = members[leftIndex]!; const right = members[rightIndex]!;
    const evidence = compareEvents(left, right);
    if (evidence && evidence.method !== "EXTERNAL_ID_NAMESPACE") union.union(left.id, right.id);
  }
  const components = new Map<number, SourceEvent[]>(); for (const event of events) { const root = union.find(event.id); components.set(root, [...(components.get(root) ?? []), event]); }
  const existingResult = await client.query(`SELECT event_id,canonical_event_id FROM event_matches WHERE status='MATCHED' AND canonical_event_id IS NOT NULL`);
  const existingCanonical = new Map(existingResult.rows.map((row) => [Number(row.event_id), Number(row.canonical_event_id)]));
  const componentCanonical = new Map<number, number | null>();
  const componentConflict = new Map<number, number[]>();
  for (const [root, component] of components) {
    const sources = unique(component.map((event) => event.sportsbook)).sort();
    if (sources.length < 2) continue;
    if (component.some((event) => conflicts.has(event.id))) { componentCanonical.set(root, null); continue; }
    const known = unique(component.map((event) => existingCanonical.get(event.id)).filter((id): id is number => id !== undefined));
    if (known.length > 1) { componentCanonical.set(root, null); componentConflict.set(root, known); continue; }
    const canonicalId = known[0] ?? component.reduce((lowest, event) => Math.min(lowest, event.id), Number.MAX_SAFE_INTEGER);
    componentCanonical.set(root, canonicalId);
    const anchor = rawById.get(canonicalId) ?? rawById.get(component[0]!.id)!;
    await ensureCanonicalEvent(client, canonicalId, anchor);
    for (const event of component) {
      const raw = rawById.get(event.id)!;
      await persistConfirmedAliases(client, canonicalId, raw);
      await client.query(`INSERT INTO canonical_event_external_ids(source_namespace,external_event_id,canonical_event_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [sourceNamespace(event.sportsbook), event.sourceEventId, canonicalId]);
    }
  }
  const processIds = requested ? new Set(requested) : new Set(events.map((event) => event.id));
  if (requested) for (const event of events) { const component = components.get(union.find(event.id))!; if (component.some((member) => requested.has(member.id))) processIds.add(event.id); }
  for (const event of events) {
    const component = components.get(union.find(event.id))!; const sources = unique(component.map((item) => item.sportsbook)).sort();
    const root = union.find(event.id); const knownConflict = conflicts.get(event.id); const stableConflict = componentConflict.get(root);
    if (knownConflict || stableConflict) eventDecisions.push({ sourceId: event.id, decision: { canonicalId: null, status: "CONFLICT", method: knownConflict ? "EXTERNAL_ID_SEMANTIC_CONTRADICTION" : "CANONICAL_COMPONENT_COLLISION", confidence: 0, sources, evidence: { conflicts: knownConflict ?? [], canonicalIds: stableConflict ?? [] } } });
    else if (sources.length >= 2) {
      const canonicalId = componentCanonical.get(root)!;
      const namespaces = unique(component.map((item) => sourceNamespace(item.sportsbook))).sort();
      const crossSource = namespaces.length > 1;
      eventDecisions.push({ sourceId: event.id, decision: { canonicalId, status: "MATCHED", method: crossSource ? "EXTERNAL_ID_AND_SEMANTIC_COMPONENT" : "EXTERNAL_ID_NAMESPACE", confidence: crossSource ? 0.97 : 0.995, sources, evidence: { canonicalEventId: canonicalId, componentEventIds: component.map((item) => item.id).sort((a, b) => a - b), sourceNamespaces: namespaces, anchorSourceEvent: byId.get(canonicalId)?.sourceEventId ?? null } } });
    } else eventDecisions.push({ sourceId: event.id, decision: { canonicalId: null, status: "UNMATCHED", method: "NO_SUFFICIENT_EVIDENCE", confidence: 0, sources: [], evidence: { sport: event.sport, competition: event.competition, participantPair: eventPairKey(event), eventStartTime: event.startTime, lifecycle: lifecycle(event.status) } } });
  }
  await writeDecisionBatch(client, "event", eventDecisions.filter(({ sourceId }) => processIds.has(sourceId)));
  return processIds;
}

const asMarkets = (rows: Record<string, unknown>[]): SourceMarket[] => rows.map((row) => ({ id: Number(row.id), eventId: Number(row.event_id), sportsbook: String(row.sportsbook), canonicalEventId: Number(row.canonical_event_id), market: row.market_type as string | null, period: row.market_period as string | null, player: row.participant_player as string | null, home: row.home_participant as string | null, away: row.away_participant as string | null, status: row.event_status as string | null }));
type CanonicalCache = { markets: Map<string, number>; selections: Map<string, number> };
const cacheMarketKey = (eventId: number, identity: string): string => `${eventId}\u0000${identity}`;
const cacheSelectionKey = (marketId: number, identity: string): string => `${marketId}\u0000${identity}`;
async function canonicalMarketId(client: PoolClient, canonicalEventId: number, semantic: SemanticMarket, cache: CanonicalCache): Promise<number> {
  const key = marketIdentity(semantic);
  const cached = cache.markets.get(cacheMarketKey(canonicalEventId, key)); if (cached) return cached;
  const result = await client.query<{ id: number }>(`INSERT INTO canonical_markets(canonical_event_id,family,type_key,subject_kind,subject_key,period_key,identity_key) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(canonical_event_id,identity_key) DO UPDATE SET identity_key=EXCLUDED.identity_key RETURNING id`, [canonicalEventId, semantic.family, semantic.typeKey, semantic.subjectKind, semantic.subjectKey, semantic.periodKey, key]);
  const id = result.rows[0]!.id; cache.markets.set(cacheMarketKey(canonicalEventId, key), id); return id;
}
async function canonicalSelectionId(client: PoolClient, canonicalMarketIdValue: number, semantic: SemanticSelection, cache: CanonicalCache): Promise<number> {
  const key = selectionIdentity(semantic);
  const cached = cache.selections.get(cacheSelectionKey(canonicalMarketIdValue, key)); if (cached) return cached;
  const result = await client.query<{ id: number }>(`INSERT INTO canonical_selections(canonical_market_id,selection_key,line_key,identity_key) VALUES($1,$2,$3,$4) ON CONFLICT(canonical_market_id,identity_key) DO UPDATE SET identity_key=EXCLUDED.identity_key RETURNING id`, [canonicalMarketIdValue, semantic.selectionKey, semantic.lineKey, key]);
  const id = result.rows[0]!.id; cache.selections.set(cacheSelectionKey(canonicalMarketIdValue, key), id); return id;
}

async function reconcileMarketsAndSelections(client: PoolClient, eventIds: Set<number>): Promise<void> {
  if (!eventIds.size) return;
  const scopedEventIds = [...eventIds];
  const canonicalMarketRows = await client.query(`SELECT id,canonical_event_id,identity_key FROM canonical_markets`);
  const canonicalSelectionRows = await client.query(`SELECT id,canonical_market_id,identity_key FROM canonical_selections`);
  const cache: CanonicalCache = { markets: new Map(canonicalMarketRows.rows.map((row) => [cacheMarketKey(Number(row.canonical_event_id), String(row.identity_key)), Number(row.id)])), selections: new Map(canonicalSelectionRows.rows.map((row) => [cacheSelectionKey(Number(row.canonical_market_id), String(row.identity_key)), Number(row.id)])) };
  const eventDecisions = await client.query(`SELECT event_id,status,canonical_event_id FROM event_matches`);
  const matchedEvents = new Map(eventDecisions.rows.filter((row) => row.status === "MATCHED" && row.canonical_event_id !== null).map((row) => [Number(row.event_id), Number(row.canonical_event_id)]));
  const marketRows = await client.query(`SELECT m.id,m.event_id,b.key AS sportsbook,em.canonical_event_id,m.market_type,m.market_period,m.participant_player,e.home_participant,e.away_participant,e.event_status FROM markets m JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN event_matches em ON em.event_id=e.id WHERE m.event_id=ANY($1::bigint[]) ORDER BY m.id`, [scopedEventIds]);
  const allMarkets = asMarkets(marketRows.rows).map((market) => ({ ...market, canonicalEventId: matchedEvents.get(market.eventId) ?? 0 })); const matchedMarkets = allMarkets.filter((market) => market.canonicalEventId > 0);
  const selectionRows = await client.query(`SELECT s.id AS selection_id,s.selection_name,s.line,m.id,m.event_id,b.key AS sportsbook,em.canonical_event_id,m.market_type,m.market_period,m.participant_player,e.home_participant,e.away_participant,e.event_status FROM selections s JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN event_matches em ON em.event_id=e.id WHERE m.event_id=ANY($1::bigint[]) ORDER BY s.id`, [scopedEventIds]);
  const allSelections: SourceSelection[] = selectionRows.rows.map((row) => ({ ...asMarkets([row])[0]!, canonicalEventId: matchedEvents.get(Number(row.event_id)) ?? 0, selectionId: Number(row.selection_id), selection: row.selection_name as string | null, line: row.line as string | null }));
  const marketById = new Map(matchedMarkets.map((market) => [market.id, market]));
  const candidates = allSelections.filter((selection) => marketById.has(selection.id));
  const grouped = new Map<string, Array<{ record: SourceSelection; market: SemanticMarket; selection: SemanticSelection }>>();
  for (const record of candidates) { const market = semanticMarket(record); const selection = semanticSelection(record, market); const key = `${record.canonicalEventId}\u0000${marketIdentity(market)}\u0000${selectionIdentity(selection)}`; grouped.set(key, [...(grouped.get(key) ?? []), { record, market, selection }]); }
  const matchedSelectionCanonical = new Map<number, { canonicalSelectionId: number; canonicalMarketId: number; sources: string[]; market: SemanticMarket; selection: SemanticSelection }>();
  for (const entries of grouped.values()) {
    const sources = unique(entries.map((entry) => entry.record.sportsbook)); const first = entries[0]!;
    if (sources.length < 2 || first.market.ambiguous || first.selection.ambiguous) continue;
    const marketId = await canonicalMarketId(client, first.record.canonicalEventId, first.market, cache); const selectionId = await canonicalSelectionId(client, marketId, first.selection, cache);
    for (const entry of entries) await client.query(`INSERT INTO market_aliases(source_namespace,alias_key,alias_name,family,type_key,subject_kind,period_key) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [sourceNamespace(entry.record.sportsbook), compact(entry.record.market), entry.record.market, entry.market.family, entry.market.typeKey, entry.market.subjectKind, entry.market.periodKey]);
    for (const entry of entries) matchedSelectionCanonical.set(entry.record.selectionId, { canonicalSelectionId: selectionId, canonicalMarketId: marketId, sources: sources.sort(), market: entry.market, selection: entry.selection });
  }
  const sourceMarketCanonical = new Map<number, { canonicalMarketId: number; sources: string[]; semantic: SemanticMarket }>();
  const selectionById = new Map(allSelections.map((selection) => [selection.selectionId, selection]));
  for (const [selectionId, match] of matchedSelectionCanonical) { const source = selectionById.get(selectionId)!; sourceMarketCanonical.set(source.id, { canonicalMarketId: match.canonicalMarketId, sources: match.sources, semantic: match.market }); }
  const selectionDecisions: Array<{ sourceId: number; decision: Decision }> = [];
  for (const selection of allSelections) {
    const match = matchedSelectionCanonical.get(selection.selectionId); const market = semanticMarket(selection); const semantic = semanticSelection(selection, market);
    if (match) selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: match.canonicalSelectionId, status: "MATCHED", method: "SEMANTIC_MARKET_SELECTION_LINE", confidence: 1, sources: match.sources, evidence: { canonicalMarket: marketIdentity(match.market), selection: selectionIdentity(match.selection), lifecycle: lifecycle(selection.status) } } });
    else if (!matchedEvents.has(selection.eventId)) selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: null, status: "UNMATCHED", method: "EVENT_NOT_MATCHED", confidence: 0, sources: [], evidence: {} } });
    else if (semantic.ambiguous) selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: null, status: "AMBIGUOUS", method: "INCOMPLETE_SEMANTIC_DIMENSIONS", confidence: 0, sources: [], evidence: { market: marketIdentity(market), selection: selectionIdentity(semantic) } } });
    else selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: null, status: "UNMATCHED", method: "NO_EXACT_SEMANTIC_PEER", confidence: 0, sources: [], evidence: { market: marketIdentity(market), selection: selectionIdentity(semantic) } } });
  }
  await writeDecisionBatch(client, "selection", selectionDecisions);
  const marketDecisions: Array<{ sourceId: number; decision: Decision }> = [];
  for (const market of allMarkets) {
    const match = sourceMarketCanonical.get(market.id); const semantic = semanticMarket(market);
    if (match) marketDecisions.push({ sourceId: market.id, decision: { canonicalId: match.canonicalMarketId, status: "MATCHED", method: "SEMANTIC_MARKET_WITH_SELECTION_LINE", confidence: 1, sources: match.sources, evidence: { market: marketIdentity(match.semantic), lifecycle: lifecycle(market.status) } } });
    else if (!matchedEvents.has(market.eventId)) marketDecisions.push({ sourceId: market.id, decision: { canonicalId: null, status: "UNMATCHED", method: "EVENT_NOT_MATCHED", confidence: 0, sources: [], evidence: {} } });
    else if (semantic.ambiguous) marketDecisions.push({ sourceId: market.id, decision: { canonicalId: null, status: "AMBIGUOUS", method: "INCOMPLETE_SEMANTIC_DIMENSIONS", confidence: 0, sources: [], evidence: { market: marketIdentity(semantic) } } });
    else marketDecisions.push({ sourceId: market.id, decision: { canonicalId: null, status: "UNMATCHED", method: "NO_EXACT_SEMANTIC_SELECTION_PEER", confidence: 0, sources: [], evidence: { market: marketIdentity(semantic) } } });
  }
  await writeDecisionBatch(client, "market", marketDecisions);
}

/** Rebuilds decisions from source projections. It never mutates RAW or odds/event history. */
export async function reconcileMatching(client: PoolClient, options: { full?: boolean } = {}): Promise<void> {
  const pending = options.full ? null : new Set((await client.query(`SELECT event_id FROM matching_work_queue ORDER BY enqueued_at FOR UPDATE SKIP LOCKED`)).rows.map((row) => Number(row.event_id)));
  const processed = await reconcileEvents(client, pending);
  await reconcileMarketsAndSelections(client, processed);
  if (options.full) await client.query(`DELETE FROM matching_work_queue`);
  else if (pending && pending.size) await client.query(`DELETE FROM matching_work_queue WHERE event_id=ANY($1::bigint[])`, [[...pending]]);
}
