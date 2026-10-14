import type { RawPayloadInput } from '../normalization/types.js';
import { redactSecrets } from '../health/logger.js';
export const MAX_RAW_BYTES = 256 * 1024;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const PRIVATE = /password|passwd|secret|token|cookie|authorization|api.?key|email|phone|address|balance|wallet|account|session|customer|username|user_id|ip_address/i;
// Explicit market-data vocabulary. Unknown fields are discarded, including new provider fields.
const FIELDS = new Set(`status contentType body data events event game race races runners markets market selections outcomes outcome prices price odds decimal american fractional handicap line total name description id type period displayGroups competitors participants home away startTime start_time commence_time generatedAt generated_at sport sport_key category category_label league competition venue country distance_m race_name race_number runner_names best_book best_price best_win number sides top stale books books_names bookmaker winOdds placeOdds tabNo scratched raceId raceNumber lastModified lastUpdated timestamp updatedAt capturedAt version nextKey marketHash outcomeOne outcomeTwo outcomeOneName outcomeTwoName teamOneName teamTwoName teamOne teamTwo oddsOne oddsTwo startLabel seriesFormat moneylineA moneylineB openingMoneylineA openingMoneylineB fighterA fighterB weightClass percentageOdds size gameTime sportXeventId liveEnabled sportLabel leagueId leagueLabel mainLine games teams full_name away_team_id home_team_id book_id inserted ml_away ml_home spread_away spread_home spread_away_line spread_home_line over under key ref order eventId marketId selectionId eventName selectionName sourceId score clock points tableCount title sourceUrl rows selection moneyline matchupId promotion dateLabel fighters book bookId normalizedRecordCount capturePolicy omitted originalBytes payloadSizeBytes pageLeague outcome_id market_id event_id is_live line_status real_status display_name source_name side value rawMarketName player player_id competitor_id httpStatus finalUrl bodySha256 bodyBytes truncated markers runtimeStatus failureReason strategy method path requestType transport candidates confidence reasons detectedFields structuralExample timestamp sizeBytes operationName responseSchema navigationRelation redirectFrom heartbeat reconnect snapshot delta`.split(' '));
export function safeMarketUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const u=new URL(value); u.username=''; u.password=''; u.hash=''; for(const k of [...u.searchParams.keys()]) if(!['pageSize','liveOnly','preMatchOnly','marketHash','showTakerPerspective','bookIds','date','week','seasonType','periods'].includes(k)) u.searchParams.delete(k); return u.toString(); } catch { return null; }
}
export function rawUrlAllowed(source: string, value: string): boolean {
  try { const u=new URL(value); if(u.hostname==='127.0.0.1'||u.hostname==='localhost') return true;
    if(/account|auth|login|payment|wallet|profile|session|customer/i.test(u.pathname)) return false;
    if(source==='bovada') return /(^|\.)bovada\.lv$/.test(u.hostname)&&/^\/services\/sports\//.test(u.pathname);
    if(source==='sxbet') return u.hostname==='api.sx.bet'&&/^\/(markets\/active|orderbook-v3\/snapshot|sports)$/.test(u.pathname);
    if(source==='actionnetwork') return (u.hostname==='api.actionnetwork.com'&&/^\/web\/v[12]\/scoreboard\/[^/]+$/.test(u.pathname)) || (u.hostname==='api.actionnetwork.com'&&u.pathname==='/web/v1/books') || (u.hostname==='www.actionnetwork.com'&&/^\/[^/]+\/odds\/?$/.test(u.pathname));
    if(source==='yahoo-odds') return u.hostname==='sports.yahoo.com'&&/^\/[a-z-]+\/odds\/$/.test(u.pathname);
    if(source==='bestfightodds') return u.hostname==='www.bestfightodds.com'&&u.pathname==='/';
    if(source==='fightodds') return u.hostname==='fightodds.io'&&u.pathname==='/odds';
    if(source==='puntersedge') return u.hostname==='puntersedge.online'&&u.pathname==='/best-odds';
    if(source==='racehub') return u.hostname==='racehub.com.au'&&u.pathname==='/odds';
    if(source==='strikingodds') return u.hostname==='www.strikingodds.io'&&(/^\/$/.test(u.pathname)||u.pathname==='/api/odds');
    if(source==='muaythai2000') return u.hostname==='www.muaythai2000.com'&&/^\/en\/?$/.test(u.pathname);
    if(source==='marathonbet') return u.hostname==='www.marathonbet.com'&&/\/betting\//.test(u.pathname);
    if(source==='esportsinsider-best') return u.hostname==='esportsinsider.com'&&/^\/betting-odds\//.test(u.pathname);
    if(source==='1xbet') return u.hostname==='1xbet.co.ke'&&/^\/en\/line\/trotting\//.test(u.pathname);
    if(source==='betonline') return /(^|\.)betonline\.ag$/.test(u.hostname)&&/sport|offering|event|market|odds|diffusion/i.test(u.pathname);
    if(source.startsWith('network:')) { const domain=source.slice('network:'.length).replace(/^www\./,''); return u.hostname===domain || u.hostname.endsWith(`.${domain}`); }
    if(source.startsWith('dom:')) { const domain=source.slice('dom:'.length).replace(/^www\./,''); return u.hostname===domain || u.hostname.endsWith(`.${domain}`); }
    if(source.startsWith('accessibility:')) { const domain=source.slice('accessibility:'.length).replace(/^www\./,''); return u.hostname===domain || u.hostname.endsWith(`.${domain}`); }
    if(source.startsWith('visual:')) { const domain=source.slice('visual:'.length).replace(/^www\./,''); return u.hostname===domain || u.hostname.endsWith(`.${domain}`); }
    if(source.startsWith('registry:')) return u.hostname===source.slice('registry:'.length);
    return false;
  } catch { return false; }
}
function clean(value: unknown, depth=0): unknown {
  if(depth>18) return null;
  if(Array.isArray(value)) return value.slice(0,250).map(v=>clean(v,depth+1));
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([k])=>(FIELDS.has(k)||/^\d+$/.test(k))&&!PRIVATE.test(k)).map(([k,v])=>[k,clean(v,depth+1)]));
  if(typeof value==='string') {
    if(/^[\s]*[\[{]/.test(value)) { if(Buffer.byteLength(value)>MAX_INPUT_BYTES)return '[OMITTED: input-size]'; try {return clean(JSON.parse(value),depth+1);}catch{return '[OMITTED: unparsed]';} }
    if(value.length>MAX_RAW_BYTES) return '[OMITTED: size]';
    return redactSecrets(value.slice(0,2048));
  }
  return value;
}
export function sanitizeRawPayload(input: RawPayloadInput): RawPayloadInput {
  const encoded=JSON.stringify(input.rawPayload)??'';
  const allowed=!!input.sourceUrl && rawUrlAllowed(input.sportsbook,input.sourceUrl);
  const opaque=['dom','html','diffusion','websocket','sse'].includes(input.sourceType);
  let rawPayload: unknown=input.sourceType==='dom-extraction' && allowed ? cleanDomEvidence(input.rawPayload) : input.sourceType==='accessibility-extraction' && allowed ? cleanAccessibilityEvidence(input.rawPayload) : input.sourceType==='visual-extraction' && allowed ? cleanVisualEvidence(input.rawPayload) : allowed && !opaque && Buffer.byteLength(encoded)<=MAX_INPUT_BYTES ? clean(input.rawPayload) : {capturePolicy:'market-allowlist-v1',omitted:opaque?'opaque-or-dom':!allowed?'source-not-allowlisted':'size',originalBytes:Buffer.byteLength(encoded)};
  if(Buffer.byteLength(JSON.stringify(rawPayload))>MAX_RAW_BYTES) rawPayload={capturePolicy:'market-allowlist-v1',omitted:'size'};
  return {...input,sourceUrl:safeMarketUrl(input.sourceUrl),sourceTopic:null,sourceRequestId:null,rawPayload,payloadSizeBytes:Buffer.byteLength(JSON.stringify(rawPayload))};
}

function cleanVisualEvidence(value: unknown): unknown {
  const root = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const str = (item: unknown, max = 200): string | null => typeof item === 'string' ? String(redactSecrets(item.slice(0, max))) : null;
  const num = (item: unknown): number | null => typeof item === 'number' && Number.isFinite(item) ? item : null;
  const box = (item: unknown) => { const b = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {}; return { x: num(b.x), y: num(b.y), width: num(b.width), height: num(b.height) }; };
  const candidates = Array.isArray(root.candidates) ? root.candidates.slice(0, 200).map((item) => {
    const c = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return { status: str(c.status, 20), reason: str(c.reason), confidence: num(c.confidence), evidenceKey: str(c.evidenceKey, 24), event: str(c.event), market: str(c.market, 80), sportsbook: str(c.sportsbook, 80), selections: Array.isArray(c.selections) ? c.selections.slice(0, 3).map((v) => str(v, 80)) : [], prices: Array.isArray(c.prices) ? c.prices.slice(0, 3).map((v) => str(v, 30)) : [], row: box(c.row), column: c.column ? box(c.column) : null };
  }) : [];
  return { capturePolicy: 'visual-evidence-v1', status: str(root.status, 40), sourceUrl: safeMarketUrl(str(root.sourceUrl, 2000)), boardHash: str(root.boardHash, 64), viewport: box(root.viewport), market: str(root.market, 60), eventRegions: num(root.eventRegions), marketRegions: num(root.marketRegions), selectionCandidates: num(root.selectionCandidates), oddsCandidates: num(root.oddsCandidates), completeMarkets: num(root.completeMarkets), accepted: num(root.accepted), rejected: num(root.rejected), primaryRejection: str(root.primaryRejection), screenshotHashes: Array.isArray(root.screenshotHashes) ? root.screenshotHashes.slice(0, 4).map((v) => str(v, 64)) : [], excerpt: str(root.excerpt, 500), candidates };
}

function cleanAccessibilityEvidence(value: unknown): unknown {
  const root=value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const string=(item:unknown,max=500):string|null=>typeof item==='string'?String(redactSecrets(item.slice(0,max))):null;
  const number=(item:unknown):number|null=>typeof item==='number'&&Number.isFinite(item)?item:null;
  const evidence=Array.isArray(root.evidence)?root.evidence.slice(0,40).map((item)=>{
    const row=item && typeof item==='object' && !Array.isArray(item)?item as Record<string,unknown>:{};
    return {role:string(row.role,40),name:string(row.name,200),path:string(row.path,400),reason:string(row.reason,80)};
  }):[];
  return {capturePolicy:'accessibility-evidence-v1',status:string(root.status,60),sourceUrl:safeMarketUrl(string(root.sourceUrl,2000)),parserVersion:string(root.parserVersion,100),treeHash:string(root.treeHash,64),nodeCount:number(root.nodeCount),relevantNodes:number(root.relevantNodes),eventCandidates:number(root.eventCandidates),oddsCandidates:number(root.oddsCandidates),excludedIllustrative:number(root.excludedIllustrative),evidence};
}

/** DOM collection is evidence, not an arbitrary rendered-page archive. */
function cleanDomEvidence(value: unknown): unknown {
  const root=value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const string=(item:unknown,max=2_000):string|null=>typeof item==='string'?String(redactSecrets(item.slice(0,max))):null;
  const candidate=(item:unknown)=>{
    const row=item && typeof item==='object' && !Array.isArray(item) ? item as Record<string,unknown> : {};
    const evidence=Array.isArray(row.evidence)?row.evidence.slice(0,4).map((entry)=>{
      const e=entry && typeof entry==='object' && !Array.isArray(entry)?entry as Record<string,unknown>:{};
      const attributes=e.attrs && typeof e.attrs==='object' && !Array.isArray(e.attrs)?Object.fromEntries(Object.entries(e.attrs as Record<string,unknown>).filter(([key,value])=>/^(data-(event|fixture|match|game|market|selection|outcome|odds|testid)|aria-label|role|id|title)$/i.test(key)&&typeof value==='string'&&!PRIVATE.test(key)).slice(0,12).map(([key,value])=>[key,string(value,160)])):{};
      return {path:string(e.path,500),text:string(e.text),attrs:attributes,fragment:string(e.fragment,3_000)};
    }):[];
    const record=row.record&&typeof row.record==='object'&&!Array.isArray(row.record)?row.record as Record<string,unknown>:{};
    return {status:string(row.status,40),confidence:typeof row.confidence==='number'?row.confidence:null,reasons:Array.isArray(row.reasons)?row.reasons.slice(0,8).map((reason)=>string(reason,240)):[],evidence,record:{eventName:string(record.eventName),market:string(record.market),selection:string(record.selection),line:string(record.line,100),odds:string(record.odds,100)}};
  };
  return {capturePolicy:'dom-evidence-v1',status:string(root.status,60),sourceUrl:safeMarketUrl(string(root.sourceUrl,2_000)),parserVersion:string(root.parserVersion,100),eventCards:typeof root.eventCards==='number'?root.eventCards:null,visibleOdds:typeof root.visibleOdds==='number'?root.visibleOdds:null,scrolls:typeof root.scrolls==='number'?root.scrolls:null,profileEventCount:typeof root.profileEventCount==='number'?root.profileEventCount:null,candidates:Array.isArray(root.candidates)?root.candidates.slice(0,100).map(candidate):[]};
}
