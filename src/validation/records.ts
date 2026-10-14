import { oddsToDecimal, type OddsFormat } from '../normalization/odds.js';
import type { ProviderRecord } from '../normalization/types.js';

export const VALIDATION_VERSION = 'sports-association-v3';
export type RecordAssessment = { status: 'VALID' | 'PARTIAL' | 'AMBIGUOUS' | 'UNRELATED'; reason: string };
const oddsInLabel = /[+-]\d{3,}|\b\d+\.\d{2,}\b|[▲▼%]/;
export const isBestFightOdds = (source: { type?: string; url?: string }) => source.type === 'bestfightodds' || /^https?:\/\/(?:www\.)?bestfightodds\.com(?:[/:]|$)/i.test(source.url || '');
export function assessRecord(row: ProviderRecord, evidenceUrl?: string): RecordAssessment {
  const fail = (reason: string): RecordAssessment => ({status:'AMBIGUOUS',reason});
  if (/\/(?:news|blog|articles?|contact|help|privacy|terms)(?:[/.?#-]|$)/i.test(evidenceUrl || row.sourceUrl || '')) return {status:'UNRELATED',reason:'Contenido informativo ajeno a los mercados.'};
  if (typeof row.eventName !== 'string' || !row.eventName.trim() || typeof row.market !== 'string' || !row.market.trim() || typeof row.selection !== 'string' || !row.selection.trim() || !(row.rawOdds || row.decimalOdds && Number.isFinite(row.decimalOdds) && row.decimalOdds > 1)) return fail('Falta evento, mercado, selección o precio utilizable.');
  if (row.participants != null && (!Array.isArray(row.participants) || row.participants.some(p=>typeof p !== 'string'))) return fail('Participantes mal formados; no hay asociación utilizable.');
  if (row.rawOdds) {const raw=String(row.rawOdds).trim();const format=row.rawOddsFormat || (raw.includes('/')?'fractional':/^[+-]/.test(raw)?'american':'decimal');if(!['fractional','american','decimal'].includes(format) || !(oddsToDecimal(raw,format as OddsFormat)! > 1)) return fail('Precio original sin formato numérico utilizable.');}
  if (row.eventName.length > 240 || /%|LATEST.*NEWS|UPCOMING EVENTS/i.test(row.eventName) || row.participants?.some(p => p.length > 100 || oddsInLabel.test(p))) return fail('El supuesto evento mezcla secciones o participantes con precios / porcentajes.');
  if (row.selection.length > 120 || oddsInLabel.test(row.selection)) return fail('La selección contiene precios de otras columnas o texto ajeno.');
  if (/parlay-mode-container|^(?:source:)?(?:body|main|container|content)$/i.test(row.sourceEventId || '')) return fail('Identificador de interfaz; no identifica un evento deportivo.');
  if (/^(CONFLICT|REJECTED)$/i.test(row.qualifiers?.crossValidation || '')) return fail('La comprobación de la cuota detectó un conflicto.');
  const q = row.qualifiers || {};
  if (q.profileVersion === 'generic-v1') return fail('Extractor genérico antiguo: no se conservó una asociación local demostrable.');
  const bfo = isBestFightOdds({type: row.sportsbook || '', url:evidenceUrl || row.sourceUrl || ''});
  if (bfo && (!/^\d+$/.test(row.sourceEventId || '') || !row.bookmaker || !q.displayedBookId || !/^bestfightodds-dom-v[23]$/.test(q.profileVersion || '') || !row.sourceSelectionId || row.participants?.length !== 2 || !row.participants.includes(row.selection))) return fail('BestFightOdds: falta la relación data-mu / data-li / cabecera de casa; requiere estructura original.');
  if (q.extraction === 'rendered-dom' && !bfo && q.association !== 'local-market-selection-price') return fail('DOM sin prueba local de evento, mercado, selección y precio.');
  if (!bfo && !row.sourceEventId && !q.association) return fail('No hay identidad deportiva ni asociación local verificable.');
  const missing = [!row.sport && 'deporte', !row.competition && 'competición', !row.eventStartTime && 'fecha del evento', bfo && !row.bookmaker && 'casa'].filter(Boolean);
  return {status: missing.length ? 'PARTIAL' : 'VALID',reason: missing.length ? `Metadatos incompletos: ${missing.join(', ')}. La asociación de la cuota está comprobada.` : 'Asociación deportiva comprobada.'};
}
export const usableRecord = (row: ProviderRecord, url?: string) => ['VALID','PARTIAL'].includes(assessRecord(row,url).status);
export const quoteKey = (row: ProviderRecord) => JSON.stringify([row.sportsbook,row.bookmaker ?? row.qualifiers?.displayedBookId,row.sourceEventId || row.qualifiers?.domEventKey || [row.sourceUrl,row.eventName,row.eventStartTime],row.sourceMarketId,row.market,row.marketPeriod,row.phase,row.line,row.selection,row.sourceSelectionId,row.participantPlayer,row.qualifiers?.variant]);
