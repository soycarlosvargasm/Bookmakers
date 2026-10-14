(() => {
  // Actividad > Matching e IA: explicit controls for the matching layer.
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = value => Number(value ?? 0).toLocaleString('en-US');
  const when = iso => iso ? new Date(iso).toLocaleString('es-ES', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const METHOD = { rules: 'Reglas', ai: 'IA', manual: 'Tú', canonical: 'Canónico' };
  let timer = null, busy = false;

  async function call(path, body) {
    const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'No se pudo completar la acción.');
    return data;
  }
  function lock(value) { busy = value; for (const id of ['#mcRules', '#mcAi']) $(id).disabled = value; document.querySelectorAll('#mcPairs button, #mcGrouped button').forEach(b => b.disabled = value); }

  function statusLine(s) {
    $('#mcStatus').innerHTML = `<b>${n(s.events)}</b> eventos · <b>${n(s.matches)}</b> partidos únicos · <b>${n(s.merged)}</b> agrupados (reglas ${n(s.byRules)} · IA ${n(s.byAi)} · tú ${n(s.byManual)} · canónico ${n(s.byCanonical)}) · <b>${n(s.pendingForAi)}</b> ambiguos · IA: ${s.ai.available ? `disponible (${esc(s.ai.model)})` : esc(s.ai.reason || 'no disponible')}${s.aiRunning ? ' · <b>trabajando…</b>' : ''} · última pasada ${esc(when(s.lastRunAt))}${s.persistent ? '' : ' · sin guardado (falta la tabla)'}`;
    $('#mcAuto').checked = s.autoAi; $('#mcCancel').disabled = !s.aiRunning; $('#mcAi').disabled = busy || !s.ai.available;
  }
  const decideButtons = row => `<button class="small-button" data-same="${esc(row.a.eventId)}|${esc(row.b.eventId)}" type="button">Mismo partido</button> <button class="small-button" data-different="${esc(row.a.eventId)}|${esc(row.b.eventId)}" type="button">Son distintos</button>${row.state !== 'pending' ? ` <button class="small-button" data-forget="${esc(row.key)}" type="button">Olvidar</button>` : ''}`;
  const stateText = row => row.state === 'pending' ? 'Sin decidir' : row.state === 'ai-different' ? `IA: distintos (${Math.round((row.aiConfidence ?? 0) * 100)}%)${row.aiReason ? ` · ${esc(row.aiReason)}` : ''}` : `IA: sin decisión segura${row.aiReason ? ` · ${esc(row.aiReason)}` : ''}`;

  async function refresh() {
    try {
      const [status, groups] = await Promise.all([call('/api/matching/status'), call('/api/matching/groups')]);
      statusLine(status);
      $('#mcPairsCount').textContent = `(${n(groups.pairs.length)})`; $('#mcGroupedCount').textContent = `(${n(groups.grouped.length)})`;
      $('#mcPairs').innerHTML = groups.pairs.length ? groups.pairs.map(row => `<tr><td>${esc(row.a.house)}</td><td>${esc(row.a.listing)}</td><td>${esc(row.b.house)}</td><td>${esc(row.b.listing)}</td><td>${esc(when(row.start))}</td><td>${stateText(row)}<small>${esc(row.reasons.join(' · '))}</small></td><td class="mc-actions">${decideButtons(row)}</td></tr>`).join('') : '<tr><td class="empty-state" colspan="7">No hay casos ambiguos.</td></tr>';
      $('#mcGrouped').innerHTML = groups.grouped.length ? groups.grouped.map(row => `<tr><td>${esc(row.house)}</td><td>${esc(row.listing)}</td><td>${esc(row.match)}<small>${esc(row.league || '')}</small></td><td>${esc(when(row.start))}</td><td>${esc(METHOD[row.method] || row.method)}${row.method === 'ai' ? ` ${Math.round(row.confidence * 100)}%` : ''}${row.reason ? `<small>${esc(row.reason)}</small>` : ''}</td><td class="mc-actions"><button class="small-button" data-separate="${esc(row.eventId)}" type="button">Separar</button></td></tr>`).join('') : '<tr><td class="empty-state" colspan="6">Todavía no hay partidos agrupados.</td></tr>';
      if (busy) lock(true);
    } catch (error) { $('#mcStatus').textContent = error.message; }
  }
  async function act(label, run) {
    if (busy) return; lock(true); $('#mcResult').textContent = `${label}…`;
    try { const result = await run(); await refresh(); return result; }
    catch (error) { $('#mcResult').textContent = error.message; }
    finally { lock(false); await refresh(); }
  }
  $('#mcRules').onclick = () => void act('Agrupando con reglas', async () => { const r = await call('/api/matching/run', { mode: 'rules' }); $('#mcResult').textContent = `Listo: ${n(r.stats.matches)} partidos únicos, ${n(r.stats.merged)} agrupados, ${n(r.stats.pending)} ambiguos.`; });
  $('#mcAi').onclick = () => void act('Resolviendo ambiguos con IA', async () => {
    const r = (await call('/api/matching/run', { mode: 'ai' })), ai = r.ai;
    $('#mcResult').textContent = !ai ? 'Listo.' : ai.cancelled ? `IA cancelada. Resueltos antes de cancelar: ${n(ai.same)} mismos, ${n(ai.different)} distintos, ${n(ai.unsure)} sin decisión.` : ai.error ? `IA con error: ${ai.error}` : !ai.queued ? ai.reason : `IA: ${n(ai.sent)} enviados → ${n(ai.same)} mismo partido · ${n(ai.different)} distintos · ${n(ai.unsure)} sin decisión segura.`;
  });
  $('#mcCancel').onclick = async () => { try { const r = await call('/api/matching/cancel', {}); $('#mcResult').textContent = r.cancelled ? 'Cancelando IA…' : 'No hay IA en curso.'; } catch (error) { $('#mcResult').textContent = error.message; } };
  $('#mcAuto').onchange = async event => { try { statusLine(await call('/api/matching/settings', { autoAi: event.target.checked })); $('#mcResult').textContent = event.target.checked ? 'IA automática activada.' : 'IA automática desactivada: los ambiguos solo se resuelven con el botón.'; } catch (error) { $('#mcResult').textContent = error.message; await refresh(); } };
  document.addEventListener('click', event => {
    const button = event.target.closest('#panel-logs [data-same],#panel-logs [data-different],#panel-logs [data-separate],#panel-logs [data-forget]');
    if (!button || busy) return;
    const d = button.dataset;
    if (d.same || d.different) { const [a, b] = (d.same || d.different).split('|'); void act(d.same ? 'Uniendo' : 'Separando', async () => { await call('/api/matching/decision', { a, b, verdict: d.same ? 'SAME' : 'DIFFERENT' }); $('#mcResult').textContent = d.same ? 'Unidos: es el mismo partido.' : 'Marcados como partidos distintos.'; }); }
    else if (d.separate) void act('Separando', async () => { const r = await call('/api/matching/separate', { eventId: d.separate }); $('#mcResult').textContent = `Separado de ${n(r.separated)} listado(s).`; });
    else if (d.forget) void act('Olvidando', async () => { await call('/api/matching/forget', { key: d.forget }); $('#mcResult').textContent = 'Decisión olvidada: las reglas deciden de nuevo.'; });
  });
  document.addEventListener('collector-section-changed', event => {
    clearInterval(timer); timer = null;
    if (event.detail.tab !== 'logs' || event.detail.view !== 'matching') return;
    void refresh(); timer = setInterval(() => { if (!busy && !document.hidden) void refresh(); }, 4000);
  });
})();
