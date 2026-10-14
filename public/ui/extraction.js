(() => {
  // Engine monitor (Actividad > Motor en vivo): what the machine is doing. Matches / Datos guardados show what it obtained.
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const count = value => value == null ? '—' : Number(value).toLocaleString('en-US');
  const time = iso => iso ? new Date(iso).toLocaleTimeString('es-ES', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
  const ago = iso => { if (!iso) return '—'; const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)); return s < 60 ? `hace ${s} s` : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.round(s / 3600)} h`; };
  const duration = ms => { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  const shortUrl = url => { try { const u = new URL(url); return `${u.hostname.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}`.slice(0, 54); } catch { return String(url).slice(0, 54); } };
  const lines = new Map();
  let timer = null, loading = false, definitionsShown = false;

  let visible = false;
  function active() { return visible; }

  function rowMarkup(r) {
    const partial = r.partial ? '≥ ' : '';
    const stateClass = `ex-${r.state}`;
    return `<tr class="${stateClass}${r.persisted ? ' ex-past' : ''}">
      <td class="ex-source"><b>${esc(r.name)}</b><small>${r.origin === 'manual' ? 'manual' : 'programada'}${r.persisted ? ' · hoy' : ''} · ${esc(duration(r.elapsedMs))}</small></td>
      <td class="ex-state"><span class="ex-badge ${stateClass}">${esc(r.stateLabel)}</span>${r.stateDetail ? `<small title="${esc(r.stateDetail)}">${esc(r.stateDetail.slice(0, 70))}</small>` : ''}</td>
      <td>${esc(r.methodLabel)}</td>
      <td class="ex-url" title="${esc(r.currentUrl)}">${esc(shortUrl(r.currentUrl))}</td>
      <td>${esc(r.scrollLabel)}</td>
      <td>${esc(r.progressLabel)}${r.progressPercent != null ? `<div class="ex-bar"><i style="width:${r.progressPercent}%"></i></div>` : ''}</td>
      <td class="num">${r.events == null ? '—' : partial + count(r.events)}</td>
      <td class="num">${r.markets == null ? '—' : partial + count(r.markets)}</td>
      <td class="num">${r.odds == null ? '—' : partial + count(r.odds)}</td>
      <td class="num">${r.newRecords == null ? '—' : count(r.newRecords)}</td>
      <td class="num">${r.duplicates == null ? '—' : count(r.duplicates)}</td>
      <td class="num ${r.errors ? 'ex-has-errors' : ''}" ${r.lastError ? `title="${esc(r.lastError)}"` : ''}>${count(r.errors)}</td>
      <td class="num">${r.speedPerMinute == null ? '—' : `${count(r.speedPerMinute)}/min`}</td>
      <td class="ex-last">${r.lastCapture ? `${esc(time(r.lastCapture))}<small>${esc(ago(r.lastCapture))} · ${esc(r.savedLabel)}</small>` : `<small>${esc(r.savedLabel)}</small>`}</td>
    </tr>`;
  }

  async function refresh() {
    if (loading) return; loading = true;
    try {
      const response = await fetch('/api/extraction'); const data = await response.json();
      if (!response.ok) throw Error(data.error || 'No se pudo leer el motor.');
      $('#extractionRows').innerHTML = data.rows.length ? data.rows.map(rowMarkup).join('') : '<tr><td class="empty-state" colspan="14">Sin pasadas del motor todavía. Inicia una captura en «Capturas» o la programación.</td></tr>';
      const s = data.summary;
      $('#extractionSummary').textContent = `Motor: ${s.extracting} extrayendo · ${s.waiting} esperando · ${s.error} con error · ${s.done} completadas`;
      $('#extractionStop').disabled = !(s.extracting || s.waiting);
      if (!definitionsShown) { definitionsShown = true; $('#extractionDefinitions').innerHTML = Object.entries(data.definitions).map(([k, v]) => `<p><b>${esc(k)}</b> · ${esc(v)}</p>`).join(''); }
      const filter = $('#extractionLogFilter'), known = new Set([...filter.options].map(o => o.value));
      for (const r of data.rows) if (!known.has(r.source.type)) { known.add(r.source.type); filter.append(new Option(r.name, r.source.type)); }
    } catch (error) { $('#extractionSummary').textContent = `No se pudo leer el motor: ${error.message}`; }
    finally { loading = false; }
  }

  function renderLog() {
    const box = $('#extractionLog'), filter = $('#extractionLogFilter').value;
    const shown = [...lines.values()].filter(l => filter === 'all' || l.source === filter);
    box.innerHTML = shown.length ? shown.map(l => `<div class="ex-line ex-line-${esc(l.type)}"><time>${esc(time(l.time))}</time><span>${esc(l.text)}</span></div>`).join('') : '<div class="empty-state">Esperando actividad del motor…</div>';
    if ($('#extractionAutoScroll').checked) box.scrollTop = box.scrollHeight;
  }
  function addLine(line) { if (lines.has(line.id)) return; lines.set(line.id, line); if (lines.size > 600) lines.delete(lines.keys().next().value); if (active()) renderLog(); }
  async function backfill() { try { const response = await fetch('/api/extraction/log'); for (const line of await response.json()) lines.set(line.id, line); renderLog(); } catch { /* the stream will fill the log */ } }

  function start() { if (timer) return; void refresh(); void backfill(); timer = setInterval(() => void refresh(), 1500); }
  function stop() { clearInterval(timer); timer = null; }
  document.addEventListener('collector-section-changed', event => { visible = event.detail.tab === 'logs' && event.detail.view === 'motor'; if (visible) start(); else stop(); });
  window.collectorEvents?.addEventListener('extraction_log', event => { try { addLine(JSON.parse(event.data)); } catch { /* ignore malformed event */ } });
  $('#extractionLogFilter').onchange = renderLog;
  $('#extractionAutoScroll').onchange = renderLog;
  $('#extractionLogClear').onclick = () => { lines.clear(); renderLog(); };
  $('#extractionStop').onclick = () => { if (window.stopCollector) void window.stopCollector().catch(() => {}); };
})();
