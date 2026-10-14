(() => {
  // Matches: filter and compare matches, markets and prices the collector already extracted.
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const form = () => $('#matchesFilters');
  const state = { offset: 0, limit: 30, total: 0, loading: false, again: false, timer: null, facets: null, entered: false };
  const when = iso => iso ? new Date(iso).toLocaleString('es-ES', { timeZone: 'Asia/Bangkok', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha por confirmar';
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };

  function query() {
    const params = new URLSearchParams({ offset: String(state.offset), limit: String(state.limit) });
    for (const [key, value] of new FormData(form())) if (value) params.set(key, String(value));
    return params;
  }

  // Original price when the house already uses decimal odds; otherwise the decimal equivalent with the original beside it.
  function priceMarkup(cell, best) {
    if (!cell) return '<td class="mx-empty">-</td>';
    const decimalFormat = !cell.format || cell.format === 'decimal';
    const main = decimalFormat || cell.decimal == null ? cell.price : cell.decimal.toFixed(2);
    return `<td class="mx-price${best ? ' mx-best' : ''}" title="Original: ${esc(cell.price)}${cell.format ? ` (${esc(cell.format)})` : ''} · ${esc(ago(cell.observedAt))}">${esc(main)}${decimalFormat || cell.decimal == null ? '' : `<small>${esc(cell.price)}</small>`}</td>`;
  }
  function tableMarkup(block) {
    const best = {};
    for (const column of block.columns) { const values = block.rows.map(row => row.cells[column]?.decimal).filter(v => typeof v === 'number'); best[column] = values.length > 1 ? Math.max(...values) : null; }
    return `${block.heading ? `<h5 class="mx-line">${esc(block.heading)}</h5>` : ''}<div class="table-scroll"><table class="mx-table"><thead><tr><th>Casa</th>${block.columns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row => `<tr><td class="mx-book">${esc(row.bookmaker)}</td>${block.columns.map(column => priceMarkup(row.cells[column], best[column] != null && row.cells[column]?.decimal === best[column])).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function cardMarkup(card) {
    const shown = card.lines.slice(0, 4), hidden = card.lines.slice(4);
    const place = [card.country !== 'Sin país en la fuente' ? card.country : null, card.sport].filter(Boolean).join(' · ');
    return `<article class="mx-match"><div class="mx-league">${esc(card.league)}${place ? `<span>${esc(place)}</span>` : ''}</div><h3 class="mx-event">${esc(card.event)}<time>${esc(when(card.start))}</time></h3><div class="mx-market">${esc(card.market.label)}</div>${shown.map(tableMarkup).join('')}${hidden.length ? `<details class="mx-more"><summary>${hidden.length} línea${hidden.length === 1 ? '' : 's'} más</summary>${hidden.map(tableMarkup).join('')}</details>` : ''}</article>`;
  }

  function fill(select, options, empty, selected) {
    const keep = selected ?? select.value;
    select.innerHTML = `<option value="">${empty}</option>` + options.map(option => `<option value="${esc(option.value)}">${esc(option.label)} (${option.count})</option>`).join('');
    select.value = options.some(option => option.value === keep) ? keep : '';
  }
  async function loadFacets() {
    try {
      const params = query(); params.delete('offset'); params.delete('limit');
      const response = await fetch(`/api/matches/facets?${params}`); const f = await response.json();
      if (!response.ok) throw Error(f.error || 'No se pudieron leer los filtros.');
      state.facets = f; const root = form();
      fill(root.sport, f.sports, 'Todos'); fill(root.country, f.countries, 'Todos'); fill(root.league, f.leagues, 'Todas'); fill(root.bookmaker, f.bookmakers, 'Todas');
      const market = root.market.value || '1x2', groups = f.markets.filter(m => m.group), others = f.markets.filter(m => !m.group);
      root.market.innerHTML = (groups.length ? groups : [{ value: '1x2', label: '1X2 / Ganador', count: 0 }]).map(m => `<option value="${esc(m.value)}">${esc(m.label)}${m.count ? ` (${m.count})` : ''}</option>`).join('')
        + (others.length ? `<optgroup label="Otros mercados">${others.map(m => `<option value="${esc(m.value)}">${esc(m.label)} (${m.count})</option>`).join('')}</optgroup>` : '');
      root.market.value = [...root.market.options].some(o => o.value === market) ? market : '1x2';
      $('#matchesList2').innerHTML = f.matches.map(m => `<option value="${esc(m.label)}"></option>`).join('');
    } catch (error) { $('#matchesStatus').textContent = error.message; }
  }
  async function load() {
    if (state.loading) { state.again = true; return; }
    state.loading = true; state.again = false;
    try {
      const response = await fetch(`/api/matches?${query()}`); const data = await response.json();
      if (!response.ok) throw Error(data.error || 'No se pudieron leer los partidos.');
      state.total = data.total;
      $('#matchesResults').innerHTML = data.cards.length ? data.cards.map(cardMarkup).join('') : `<p class="empty-state">No hay partidos con ${esc(data.market.label)} para estos filtros.</p>`;
      const pages = Math.max(1, Math.ceil(state.total / state.limit));
      $('#matchesStatus').textContent = `${state.total.toLocaleString('en-US')} partido${state.total === 1 ? '' : 's'} · ${data.market.label}`;
      $('#matchesPageLabel').textContent = state.total > state.limit ? `Página ${Math.floor(state.offset / state.limit) + 1} de ${pages}` : '';
      $('#matchesPrev').disabled = state.offset === 0; $('#matchesNext').disabled = state.offset + state.limit >= state.total;
    } catch (error) { $('#matchesStatus').textContent = error.message; }
    finally { state.loading = false; if (state.again) void load(); }
  }
  const refreshAll = () => { void loadFacets(); void load(); };
  const filtersChanged = () => { state.offset = 0; refreshAll(); };

  document.addEventListener('collector-section-changed', event => {
    const visible = event.detail.tab === 'matches';
    clearInterval(state.timer); state.timer = null;
    if (!visible) return;
    state.entered = true; refreshAll();
    state.timer = setInterval(() => { if (!document.hidden) refreshAll(); }, 30000);
  });
  form().addEventListener('change', event => {
    // Narrowing a parent filter clears the ones below it, so a stale league never hides every match.
    if (event.target.name === 'sport') { form().country.value = ''; form().league.value = ''; }
    if (event.target.name === 'country') form().league.value = '';
    if (event.target.name !== 'search') filtersChanged();
  });
  let typing = null;
  form().search.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(filtersChanged, 350); });
  form().search.addEventListener('change', () => { clearTimeout(typing); filtersChanged(); });
  form().addEventListener('submit', event => event.preventDefault());
  $('#matchesReset').onclick = () => { form().reset(); form().market.value = '1x2'; filtersChanged(); };
  $('#matchesPrev').onclick = () => { state.offset = Math.max(0, state.offset - state.limit); void load(); window.scrollTo?.({ top: 0 }); };
  $('#matchesNext').onclick = () => { state.offset += state.limit; void load(); window.scrollTo?.({ top: 0 }); };
  document.addEventListener('data-updated', () => { if (state.entered && $('#panel-matches').classList.contains('active')) refreshAll(); });
})();
