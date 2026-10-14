/** Shared by discovery, control activation, queues and restored checkpoints. */
export const NAVIGATION_VERSION = 'sports-navigation-v2';
export function navigationUrl(value: string): string {
  const u = new URL(value);
  // A trailing empty fragment has no view identity. Meaningful fragments and parameters survive.
  return u.href.endsWith('#') ? u.href.slice(0,-1) : u.href;
}
export const informative = /\b(?:news|blog|articles?|contact|contacto|help|ayuda|faq|legal|privacy|terms|responsible|promotions?|bonuses?|affiliate|about|noticias|picks|predictions|breakdown|casino|poker|login|register|deposit|withdraw|account|wallet)\b/i;
export function navigationDecision(value: string, sourceUrl: string, context = ''): {allowed:boolean; reason:string} {
  let u:URL,source:URL; try { u=new URL(value); source=new URL(sourceUrl); } catch { return {allowed:false,reason:'URL inválida'}; }
  if (u.origin !== source.origin || !/^https?:$/.test(u.protocol) || u.username || u.password) return {allowed:false,reason:'Fuera de la fuente seleccionada'};
  let path:string;try{path=decodeURIComponent(u.pathname);}catch{return {allowed:false,reason:'Ruta con codificación inválida'};}
  if (informative.test(path.replace(/[_/-]/g,' ')) || informative.test(context)) return {allowed:false,reason:'Sección informativa, promocional o de cuenta'};
  if (/^(?:www\.)?bestfightodds\.com$/i.test(u.hostname)) return {allowed: /^\/$|^\/events(?:\/[^/]+)?\/?$|^\/boxing\/?$/.test(u.pathname),reason:'BestFightOdds: solo inicio, eventos y tablas de cuotas'};
  const allowed = (u.pathname === source.pathname && u.search === source.search && Boolean(u.hash)) || navigationUrl(value) === navigationUrl(sourceUrl) || /(?:^|[/#_-])(?:sports?|sportsbook|football|soccer|cricket|tennis|basketball|mma|boxing|events?|fixtures?|matches|leagues?|competitions?|tournaments?|prematch|inplay|in-play|eventdetails|matchdetails)(?:[/#?=_-]|$)/i.test(u.pathname+u.hash) || /\/(?:e|c|event|match)-[^/]+/.test(u.pathname) || /^(sport|event|market|league|pagination)$/.test(context);
  return {allowed,reason:allowed?'Contexto de navegación deportiva':'Sin contexto deportivo verificable; odds o vs no son prueba'};
}
export function sportsControl(label:string, category=''): boolean {
  return !informative.test(label) && (/^(?:all sports|sports|deportes|todos los deportes|football|soccer|fútbol|futbol|cricket|tennis|tenis|basketball|baloncesto|mma|ufc|boxing|boxeo|events|eventos|odds|cuotas|live|en vivo|prematch|prepartido|today|hoy|tomorrow|mañana|next|siguiente|load more|show more|ver más|mostrar más|all competitions|all leagues|competitions|leagues|countries|upcoming|show all|more|view more|all markets|todos los mercados|more markets|más mercados|moneyline|match odds|match winner|goals|points|winner|ganador|1x2|handicap|spread|totals?|over.?under|both teams to score|ambos marcan)(?:\s*\(\d+\))?$/i.test(label) || /^(sport|event|market|league|pagination)$/.test(category));
}
