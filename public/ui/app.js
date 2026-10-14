(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => value == null ? '—' : Number(value).toLocaleString('en-US');
  const freshness = window.collectorFreshness;
  const health = value => ({ok:'OK',failed:'Failed',challenge:'Challenge',unverified:'Unverified',running:'En curso',queued:'En cola',old:'antiguo',skipped:'Saltado'}[value] || 'Unverified');
  const color = value => ({ok:'ok',failed:'bad',challenge:'warn',unverified:'muted',running:'warn',queued:'muted',old:'muted',skipped:'muted'}[value] || 'muted');
  const state = { brands:[], countries:[], freshnessFilter:'24h', datosFilter:'upcoming7d', datosRange:{}, status:{}, ocrBusy:false, ocrStarting:false, stopPending:false, vision:null, changes:{rows:[],files:[]}, settings:null, logs:[], logIds:new Set(), expanded:new Set(), page:0, logFilter:'all', changeFilter:'all', datosLoaded:false, datosSport:null, datosComp:null, datosEvent:null, datosEventName:null };
  let toastTimer;
  const openingCountries=new Set(),countryOpenResults=new Map();
  function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000); }
  async function api(path,body) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch(path,{...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),signal:controller.signal});
      const text=await response.text();let value;
      try{value=JSON.parse(text);}catch{throw new Error(`Respuesta no válida del servidor (HTTP ${response.status}).`);}
      if(!response.ok)throw Object.assign(new Error(value.error||value.message||`HTTP ${response.status}`),{status:response.status});return value;
    }catch(error){if(controller.signal.aborted)throw new Error('El servidor no respondió en 15 segundos. Puedes reintentar.');throw error;}
    finally{clearTimeout(timer);}
  }
  const nativeCountryRequests=new Map();let nativeCountrySerial=0;
  window.addEventListener('collector-country-express',event=>{const data=event.detail,pending=nativeCountryRequests.get(data?.id);if(!pending)return;clearTimeout(pending.timer);nativeCountryRequests.delete(data.id);if(data.error)pending.reject(Error(data.error));else pending.resolve(data.result);});
  async function openCountryExpress(country){
    try{return await api('/api/countries/open',{country});}
    catch(error){
      const bridge=window.webkit?.messageHandlers?.countryExpress;
      if(error.status!==404||!bridge)throw error;
      return new Promise((resolve,reject)=>{const id=`${Date.now()}-${++nativeCountrySerial}`,timer=setTimeout(()=>{nativeCountryRequests.delete(id);reject(Error('Chrome no confirmó la apertura. Puedes reintentar.'));},25000);nativeCountryRequests.set(id,{resolve,reject,timer});bridge.postMessage({id,country});});
    }
  }
  function header(status) {
    state.status=status; $('.scheduler-metric').classList.toggle('stopped',!status.running);
    showChallenge(status.challenges || []);
    $('#schedulerState').textContent=status.stopping?'Deteniendo':status.starting?'Iniciando':status.running?'Activa':'Detenida';
    $('#nextCycle').textContent=status.stopping?'Cancelando ejecución y cola':status.running?(status.nextCycleAt?`${Math.max(0,Math.ceil((Date.parse(status.nextCycleAt)-Date.now())/60000))} min`:'Cycle in progress'):'—';
    $('#recordsToday').textContent=number(status.recordsToday); $('#changesToday').textContent=number(status.changesToday);
    $('#recordsToday').title=status.recordsScope?`${status.recordsScope}\n\nHoy (${status.today}): ${number(status.recordsToday)} validadas · ${number(status.pendingToday)} pendientes · ${number(status.capturesToday)} capturas${status.recordsArchive===false?' · archivo PostgreSQL no disponible; se muestran los RAW en disco':''}`:'Registros validados cuya fecha de captura (Asia/Bangkok) es hoy.';
    explorationControls();$('#ocrStop').disabled=state.stopPending||!collectionActive();
    $('#startScheduler').disabled=Boolean(status.running||status.starting||status.busy||status.stopping); $('#stopScheduler').disabled=state.stopPending||!(status.running||status.starting||status.busy||status.stopping);
    $('#stopScheduler').textContent=state.stopPending||status.stopping?'Deteniendo…':'Detener todo';
    $('#challengeStop').disabled=state.stopPending||!collectionActive();
    $('#challengeStop').textContent=state.stopPending||status.stopping?'Deteniendo…':'■ Detener todo';
    $('#updatedAt').textContent=status.warnings?.length?`Data warning: ${status.warnings.length} unreadable file(s)`:`Actualizado ${new Date().toLocaleTimeString('es-ES',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})}`;
    $('#updatedAt').title=(status.warnings||[]).join('\n'); $('#footerDate').textContent=`${status.today || ''} · ${status.timezone || ''}`;
    document.querySelectorAll('[data-action="run"],[data-action="force"]').forEach(button=>button.disabled=Boolean(status.running||status.starting||status.busy||status.stopping||!state.countries.find(country=>country.code===button.dataset.country)?.brands.length));
  }
  let selectedChallenge = null, challengeSending = false;
  const dismissedChallenges=new Set();
  function showChallenge(challenges, manual = false) {
    const current = challenges.find(c => c.runId === selectedChallenge?.runId) || challenges[0];
    selectedChallenge = current || null;
    $('#challengeBanner').hidden = !current;
    if (!current) { if ($('#challengeDialog').open) $('#challengeDialog').close(); return; }
    const personal = current.browserMode === 'renzo';
    $('#challengeBannerText').textContent = `${current.source.type}: verificación pendiente en ${personal?'tu Chrome':`el navegador de prueba · ${current.manualAttempts || 0} intentos detectados`}.`;
    $('#challengeMessage').textContent = personal
      ?`La página ya está en tu Chrome personal. Puedes resolver la verificación manualmente y seguir esperando, o cancelar esta fuente.${current.source.type==='betfair'?' Betfair conserva el recorrido de ligas, eventos y mercados.':''}`
      :`Si la verificación sigue bloqueada seis segundos después del segundo intento manual, el motor cambia automáticamente a tu Chrome personal Renzo. También puedes abrirlo ahora, seguir intentando o cancelar esta fuente. La verificación la haces tú; el motor lee la página cuando desaparezca.${current.source.type==='betfair'?' En Chrome personal, Betfair continúa el recorrido por DOM y red; OCR no está disponible.':' En Chrome personal esta conexión no dispone de OCR ni recorrido automático.'}`;
    $('#challengeUrl').textContent = current.url;
    $('#challengeChrome').disabled = challengeSending || personal;
    $('#challengeContinue').disabled = challengeSending; $('#challengeCancel').disabled = challengeSending;
    if (!state.stopPending && !state.status.stopping && (manual || current.prompt && !dismissedChallenges.has(current.id)) && !$('#challengeDialog').open && !challengeSending) { $('#challengeError').textContent=''; $('#challengeDialog').showModal(); }
  }
  function dismissChallenge(){if(selectedChallenge)dismissedChallenges.add(selectedChallenge.id);$('#challengeDialog').close();switchTab('fuentes','paises');}
  $('#challengeDismiss').onclick=dismissChallenge;
  $('#challengeDialog').addEventListener('cancel',event=>{event.preventDefault();dismissChallenge();});
  $('#challengeOptions').onclick = () => showChallenge(state.status.challenges || [], true);
  async function chooseChallenge(choice) {
    if (!selectedChallenge || challengeSending) return;
    const challenge = selectedChallenge;
    challengeSending = true; showChallenge(state.status.challenges || []);
    try {
      await api(`/api/run/${encodeURIComponent(challenge.runId)}/challenge`, {id:challenge.id, choice});
      $('#challengeDialog').close();
      toast(choice==='chrome'?'Cambiando a tu Chrome personal…':choice==='continue'?'Puedes seguir intentando manualmente.':'Fuente cancelada.');
    } catch (error) { $('#challengeError').textContent=error.message; }
    finally { challengeSending=false; await refreshStatus(); }
  }
  $('#challengeChrome').onclick = () => void chooseChallenge('chrome');
  $('#challengeContinue').onclick = () => void chooseChallenge('continue');
  $('#challengeCancel').onclick = () => void chooseChallenge('cancel');
  function brands(items) {
    state.brands=items; filters();
    const selected=$('#ocrSource').value;
    const options=items.flatMap(b=>b.regions.map(r=>({value:JSON.stringify({type:b.id,url:r.url}),label:`${b.name||b.id}${b.regions.length>1?` · ${r.country||new URL(r.url).hostname}`:''}`})));
    const html=options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    if($('#ocrSource').innerHTML!==html)$('#ocrSource').innerHTML=html;
    if(options.some(o=>o.value===selected))$('#ocrSource').value=selected;
    explorationControls();
  }
  function exactRunTime(value) {
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return 'Fecha no disponible';
    return date.toLocaleString('es-ES',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:state.status.timezone||undefined,timeZoneName:'short'});
  }
  let countrySignature = "";
  function countries(items) {
    state.countries=items;
    const selected=$('#ocrCountry').value;
    const options=items.map(country=>`<option value="${esc(country.code)}"${country.brands.length?'':' disabled=""'}>${esc(country.flag)} ${esc(country.name)} · ${country.brands.length} fuentes</option>`).join('');
    if($('#ocrCountry').innerHTML!==options)$('#ocrCountry').innerHTML=options;
    if(items.some(country=>country.code===selected&&country.brands.length))$('#ocrCountry').value=selected;
    else if(!items.find(country=>country.code===$('#ocrCountry').value)?.brands.length)$('#ocrCountry').value=items.find(country=>country.brands.length)?.code||'';
    explorationControls();
    const views=items.map(country=>freshness.countryView(country,state.freshnessFilter));
    const signature=JSON.stringify([views,[...openingCountries],[...countryOpenResults]]);
    if(signature===countrySignature) return;
    countrySignature=signature;
    $('#sourceCount').textContent=items.length;
    $('#brandList').innerHTML=views.map(country=>{
      const entries=country.brands;
      const {withData,busy,status,color:cls}=country;
      const disabled=state.status.running||state.status.busy||state.status.starting||state.status.stopping||!entries.length;
      const open=state.expanded.has(country.code);
      return `<article class="country-card ${open?'open':''}" data-country="${esc(country.code)}">
        <div class="country-header"><button class="country-summary" aria-expanded="${open}" aria-controls="country-${esc(country.code)}-brands">
          <span class="country-flag" aria-hidden="true">${country.flag}</span><span class="country-identity"><strong>${esc(country.name)}</strong><small>${esc(country.displayCode)} · ${entries.length} marcas · ${withData} con datos${state.freshnessFilter==='all'?'':' recientes'}</small></span>
          <span class="country-health"><i class="dot ${cls}"></i>${status}${country.age?` · ${esc(country.age)}`:''}${busy?' · En curso':''}</span><span class="chevron">⌄</span>
        </button><div class="country-controls"><span class="vpn-badge">${country.code==='global'?'VPN activo requerido':`VPN ${esc(country.name)} requerido`}</span><div class="country-actions">
          <button class="small-button express-button" data-action="open-country" data-country="${esc(country.code)}" ${openingCountries.has(country.code)||!entries.length?'disabled':''} title="Abre todas las páginas de ${esc(country.name)} juntas en pestañas de Chrome Renzo"><span>EXPRESS</span> ${openingCountries.has(country.code)?'Abriendo…':`Abrir ${entries.length} ${entries.length===1?'página':'páginas'}`}</button>
          <button class="small-button" data-action="run" data-country="${esc(country.code)}" ${disabled?'disabled':''}>Capturar país</button>
          <button class="small-button force" data-action="force" data-country="${esc(country.code)}" ${disabled?'disabled':''}>Capturar desde Chrome</button>
        </div></div></div>
        ${countryOpenResults.has(country.code)?`<p class="country-open-result" role="status">${esc(countryOpenResults.get(country.code))}</p>`:''}
        <div class="country-brands" id="country-${esc(country.code)}-brands">${entries.map(brand=>{
          const region=brand.region,run=region.latestRun;
          const meta=brand.lastRunAt?`<time datetime="${esc(brand.lastRunAt)}">${esc(exactRunTime(brand.lastRunAt))}</time><br>${number(run?.records)} registros · ${esc(run?.method||'—')}`:'Sin ejecuciones registradas';
          return `<div class="country-brand-row"><div><strong>${esc(brand.name)}</strong><span class="country-brand-url">${esc(region.url)}</span>${brand.note?`<span class="country-brand-url">${esc(brand.note)}</span>`:''}<button class="small-button" type="button" data-collection-source-skip="${esc(JSON.stringify({type:brand.id,url:region.url}))}">Saltar…</button></div><span class="region-status"><i class="dot ${color(brand.displayStatus)}"></i>${health(brand.displayStatus)}</span><span class="region-meta" title="${esc(run?.reason||run?.at||'')}">${meta}${run?.reason?`<details class="source-run-reason"><summary>Ver motivo</summary><p>${esc(run.reason)}</p></details>`:''}</span></div>`;
        }).join('')||'<div class="empty-state">Sin marcas configuradas.</div>'}</div>
      </article>`;
    }).join('');
  }
  function filters() {
    for(const [selector,current] of [['#changeFilter',state.changeFilter],['#logFilter',state.logFilter]]) {
      const names=[...new Set([...state.brands.map(b=>b.id),...state.changes.rows.map(r=>r.collector),...state.logs.map(l=>l.source)].filter(Boolean))].sort();
      const html='<option value="all">All sources</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
      if($(selector).innerHTML!==html) $(selector).innerHTML=html; $(selector).value=current;
    }
  }
  function rankings(rows,field,limit) {
    const counts=new Map(); rows.filter(r=>r.kind==='odds_changed'&&r[field]).forEach(r=>counts.set(r[field],(counts.get(r[field])||0)+1));
    return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([name,count])=>`<div class="rank-row"><span title="${esc(name)}">${esc(name)}</span><b>${number(count)}</b></div>`).join('')||'<div class="rank-row"><span>No odds movements recorded</span></div>';
  }
  function changes(data) {
    state.changes=data; filters();
    const rows=data.rows.filter(r=>state.changeFilter==='all'||r.collector===state.changeFilter);
    state.page=Math.min(state.page,Math.max(0,Math.ceil(rows.length/100)-1));
    $('#changeTotal').textContent=number(rows.length); $('#changeRowsLabel').textContent=`${number(rows.length)} changes · ${number(rows.filter(r=>r.kind==='odds_changed').length)} odds movements`;
    $('#topEvents').innerHTML=rankings(rows,'eventName',10); $('#topMarkets').innerHTML=rankings(rows,'market',5);
    $('#changeRows').innerHTML=rows.slice(state.page*100,state.page*100+100).map(row=>{
      const direction=row.kind==='new_selection'?'New selection':row.kind==='removed_selection'?'Removed':row.direction==='up'?'↑ Up':row.direction==='down'?'↓ Down':'—';
      const cls=row.kind==='odds_changed'?row.direction:'';
      return `<tr><td class="time">${esc(new Date(row.detectedAt).toLocaleTimeString('en-US'))}</td><td class="event" title="${esc(row.selection||'')}">${esc(row.eventName||'—')}<br><button class="details-button" data-action="change-file" data-id="${esc(row.fileId)}">View source JSON</button></td><td>${esc(row.market||'—')}</td><td>${esc(row.bookmaker||row.source||'—')}</td><td class="odds">${esc(row.previousOdds??'—')}</td><td class="odds">${esc(row.currentOdds??'—')}</td><td><span class="direction ${esc(cls)}">${direction}</span></td></tr>`;
    }).join('')||'<tr><td colspan="7" class="empty-state">No changes recorded for this day and source.</td></tr>';
    $('#pageLabel').textContent=`Page ${state.page+1} of ${Math.max(1,Math.ceil(rows.length/100))}`; $('#prevPage').disabled=state.page===0; $('#nextPage').disabled=(state.page+1)*100>=rows.length;
  }
  function logs() {
    const container=$('#logsList'), previous=container.scrollTop;
    container.innerHTML=state.logs.filter(l=>(state.logFilter==='all'||l.source===state.logFilter)&&(!state.logType||l.type===state.logType)).map(l=>`<div class="log-entry"><span class="log-time">${esc(new Date(l.time).toLocaleTimeString('en-US',{hour12:false}))}</span><span class="log-type ${esc(l.type)}">${esc(l.type)}</span><span class="log-line">${l.source?`<span class="log-source">[${esc(l.source)}]</span> `:''}${esc(l.line)}</span></div>`).join('')||'<div class="empty-state">No hay registros en esta selección.</div>';
    container.scrollTop=$('#autoScroll').checked?container.scrollHeight:previous; filters();
  }
  function addLog(entry) { if(state.logIds.has(entry.id))return;state.logIds.add(entry.id);state.logs.push(entry);if(state.logs.length>500)state.logs.shift();if(state.logIds.size>2000)state.logIds.delete(state.logIds.values().next().value);logs(); }
  const navigation={
    fuentes:{title:'Fuentes deportivas',description:'Tus casas y páginas deportivas, organizadas por región de acceso.',defaultView:'paises'},
    coleccion:{title:'Capturas',description:'Abre una página, elige el scroll y guarda sus enfrentamientos y cuotas.',defaultView:'extraer'},
    datos:{title:'Datos guardados',description:'Consulta los deportes, ligas, enfrentamientos y cuotas que ya tienes.',defaultView:'deportes'},
    matches:{title:'Matches',description:'Filtra y compara los partidos, mercados y cuotas que ya extrajo el colector.',defaultView:'comparar'},
    cambios:{title:'Cambios de cuota',description:'Consulta los movimientos registrados en tus fuentes.',defaultView:'resumen'},
    logs:{title:'Actividad',description:'Sigue las capturas en curso y revisa los errores.',defaultView:'todo'},
    configuracion:{title:'Ajustes',description:'Configura la programación y los modos de lectura.',defaultView:'programacion'}
  };
  const sectionViews={};
  function selectSubview(tab,view) {
    const panel=$(`#panel-${tab}`);if(!panel)return;
    sectionViews[tab]=view;window.scrollTo?.({top:0,behavior:'instant'});
    panel.querySelectorAll('[data-section-view]').forEach(el=>el.hidden=el.dataset.sectionView!==view);
    panel.querySelectorAll('[data-hide-in]').forEach(el=>el.hidden=el.dataset.hideIn===view);
    document.querySelectorAll('[data-nav-tab]').forEach(button=>{const active=button.dataset.navTab===tab&&button.dataset.navView===view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    const button=document.querySelector(`[data-nav-tab="${tab}"][data-nav-view="${view}"]`);
    const info=navigation[tab];$('#pageTitle').textContent=info.title;$('#pageDescription').textContent=info.description;$('#pageSection').textContent=`ESPACIO DE TRABAJO / ${info.title.toLocaleUpperCase('es')}`;
    $('#navigationLocation').textContent=info.title+' / '+(button?.textContent||'');
    if(tab==='logs'){$('#logsBlock').hidden=view==='motor'||view==='matching';state.logType=view==='errores'?'ERROR':null;logs();}
  }
  function switchTab(name,view) {
    if(!navigation[name])return;
    document.querySelectorAll('.tab').forEach(tab=>{const active=tab.dataset.tab===name;tab.classList.toggle('active',active);tab.setAttribute('aria-expanded',String(active));});
    document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===`panel-${name}`));
    document.querySelectorAll('[data-nav-children]').forEach(group=>group.hidden=group.dataset.navChildren!==name);
    const selectedView=view||sectionViews[name]||navigation[name].defaultView;selectSubview(name,selectedView);
    if(name==='datos'&&!state.datosLoaded)void loadDatos();
    document.dispatchEvent(new CustomEvent('collector-section-changed',{detail:{tab:name,view:selectedView}}));
  }
  window.collectorNavigation={go:switchTab};
  document.addEventListener('click',event=>{
    const submenu=event.target.closest('[data-nav-tab]');if(submenu){switchTab(submenu.dataset.navTab,submenu.dataset.navView);return;}
    const capture=event.target.closest('[data-open-capture]');if(capture){switchTab('coleccion','extraer');$('#ocrMode').value=capture.dataset.openCapture;$('#ocrMode').dispatchEvent(new Event('change',{bubbles:true}));if(capture.dataset.openCapture==='url')$('#ocrUrl').focus();}
  });
  let datosRequest = 0, datosRefreshing = false;
  function datosBreadcrumb(eventName) {
    $('#datoBreadcrumb').textContent=['Datos',state.datosSport,state.datosComp,eventName].filter(value=>value!=null).join(' → ');
  }
  function datosActive(selector,button) {
    $(selector).querySelectorAll('button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});
  }
  function datosUrl(path,params={}) {
    state.datosRange=freshness.dataRange(state.datosFilter);
    const query=new URLSearchParams({...params,...state.datosRange});
    return query.size?`${path}?${query}`:path;
  }
  function renderDatosSports(rows) {
    $('#datoSports').innerHTML=rows.map(row=>`<button type="button" data-dato-sport="${esc(row.sport)}" class="${row.sport===state.datosSport?'active':''}" aria-pressed="${row.sport===state.datosSport}"><strong>${esc(row.sport||'Deporte sin nombre')}</strong><small>${number(row.events)} enfrentamientos · ${number(row.sources)} fuentes</small></button>`).join('')||'<div class="empty-state">Sin cuotas vigentes capturadas dentro del período. Ejecuta una fuente o Explorar todo.</div>';
  }
  function renderDatosComps(rows) {
    $('#datoComps').innerHTML=rows.map(row=>`<button type="button" data-dato-comp="${esc(row.competition)}" class="${row.competition===state.datosComp?'active':''}" aria-pressed="${row.competition===state.datosComp}"><strong>${esc(row.competition||'Competición sin nombre')}</strong><small>${number(row.events)} enfrentamientos · ${number(row.sources)} fuentes</small></button>`).join('')||'<div class="empty-state">No hay ligas guardadas en esta selección.</div>';
  }
  function renderDatosEvents(rows) {
    $('#datoEvents').innerHTML=rows.map(row=>`<button type="button" data-dato-event="${esc(row.id)}" data-dato-name="${esc(row.event_name||'Enfrentamiento sin nombre')}" class="${String(row.id)===state.datosEvent?'active':''}" aria-pressed="${String(row.id)===state.datosEvent}"><strong>${esc(row.event_name||'Enfrentamiento sin nombre')}</strong><small>${esc(row.event_start_time?new Date(row.event_start_time).toLocaleString():'Fecha sin confirmar')}</small><small>${esc(row.sources)}</small></button>`).join('')||'<div class="empty-state">No hay enfrentamientos guardados.</div>';
  }
  function renderDatosOdds(rows) {
    $('#datoEventDetail').innerHTML=`<h4>${esc(state.datosEventName)}</h4><p>${number(rows.length)} opciones · cuotas filtradas por vigencia y captura</p><div class="table-scroll"><table><thead><tr><th>SOURCE</th><th>MARKET</th><th>SELECTION</th><th>DECIMAL ODDS</th><th>RAW ODDS</th><th>CAPTURADA</th><th>VALIDACIÓN</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.bookmaker||row.sportsbook)}${row.bookmaker?`<br><small>${esc(row.sportsbook)}</small>`:''}</td><td>${esc(row.market_type??'—')}</td><td>${esc(row.selection_name??'—')}</td><td class="odds">${esc(row.decimal_odds==null?'—':Number(row.decimal_odds))}</td><td class="odds">${esc(row.raw_odds??'—')}</td><td title="${esc(exactRunTime(row.captured_at))}">${esc(freshness.age(row.captured_at))}</td><td>${esc(row.cross_validation||'UNCONFIRMED')}</td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">No hay cuotas guardadas para este enfrentamiento.</td></tr>'}</tbody></table></div>`;
  }
  async function refreshDatos() {
    if(datosRefreshing)return;
    if(!$('#panel-datos').classList.contains('active')){state.datosLoaded=false;return;}
    if(!state.datosSport){await loadDatos();return;}
    const request=++datosRequest;
    datosRefreshing=true;
    try {
      const [sports,comps,events,odds]=await Promise.all([
        api(datosUrl('/api/data/sports')),
        api(datosUrl('/api/data/competitions',{sport:state.datosSport})),
        state.datosComp?api(datosUrl('/api/data/events',{sport:state.datosSport,competition:state.datosComp})):null,
        state.datosEvent?api(datosUrl(`/api/data/event/${encodeURIComponent(state.datosEvent)}`)):null
      ]);
      if(request!==datosRequest)return;
      if(!sports.some(row=>row.sport===state.datosSport)){
        state.datosSport=null;state.datosComp=null;state.datosEvent=null;state.datosEventName=null;
        $('#datoComps').innerHTML='<div class="empty-state">Elige un deporte para consultar sus ligas.</div>';
        $('#datoEvents').innerHTML='<div class="empty-state">Elige una liga para consultar sus enfrentamientos.</div>';
        $('#datoEventDetail').innerHTML='<div class="empty-state">Las cuotas anteriores ya no están vigentes. Elige un enfrentamiento para consultar sus cuotas.</div>';
        renderDatosSports(sports);state.datosLoaded=true;datosBreadcrumb();return;
      }
      if(state.datosComp&&!comps.some(row=>row.competition===state.datosComp)){
        state.datosComp=null;state.datosEvent=null;state.datosEventName=null;
        $('#datoEvents').innerHTML='<div class="empty-state">Elige una liga para consultar sus enfrentamientos.</div>';
        $('#datoEventDetail').innerHTML='<div class="empty-state">Las cuotas anteriores ya no están vigentes. Elige un enfrentamiento para consultar sus cuotas.</div>';
      }else if(state.datosEvent&&events&&!events.some(row=>String(row.id)===state.datosEvent)){
        state.datosEvent=null;state.datosEventName=null;
        $('#datoEventDetail').innerHTML='<div class="empty-state">Este evento ya no está vigente en el filtro actual.</div>';
      }
      renderDatosSports(sports);renderDatosComps(comps);
      if(events&&state.datosComp)renderDatosEvents(events);if(odds&&state.datosEvent)renderDatosOdds(odds);
      state.datosLoaded=true;datosBreadcrumb(state.datosEventName);
    } catch(error) {
      if(request!==datosRequest)return;
      state.datosLoaded=false;
      $('#datoBreadcrumb').textContent=`${error.message} · Reintentando automáticamente…`;
      $('#datoEventDetail').innerHTML='<div class="empty-state">No se pudo actualizar la vigencia de las cuotas. Reintentando automáticamente…</div>';
    }finally{datosRefreshing=false;}
  }
  let datosRefreshTimer;
  function scheduleDatosRefresh(){clearTimeout(datosRefreshTimer);datosRefreshTimer=setTimeout(()=>void refreshDatos(),500);}
  // Recover Data errors and refresh selected odds without requiring a tab reopen.
  setInterval(()=>void refreshDatos(),10000);
  async function loadDatos() {
    const request=++datosRequest;
    state.datosLoaded=true;
    state.datosRange=freshness.dataRange(state.datosFilter);
    state.datosSport=null;state.datosComp=null;state.datosEvent=null;state.datosEventName=null;datosBreadcrumb();
    $('#datoComps').innerHTML='<div class="empty-state">Elige un deporte para consultar sus ligas.</div>';
    $('#datoEvents').innerHTML='<div class="empty-state">Elige una liga para consultar sus enfrentamientos.</div>';
    $('#datoEventDetail').innerHTML='<div class="empty-state">Elige un enfrentamiento para consultar sus cuotas.</div>';
    $('#datoSports').innerHTML='<div class="empty-state">Cargando deportes…</div>';
    try {
      const rows=await api(datosUrl('/api/data/sports'));
      if(request!==datosRequest)return;
      renderDatosSports(rows);
    } catch(error) {
      if(request!==datosRequest)return;
      state.datosLoaded=false;
      $('#datoSports').innerHTML=`<div class="empty-state">${esc(error.message)}. Reintentando automáticamente…</div>`;
    }
  }
  document.addEventListener('click',async event=>{
    const tab=event.target.closest('[data-tab]');if(tab){switchTab(tab.dataset.tab);return;}
    const datoSport=event.target.closest('[data-dato-sport]');
    if(datoSport){
      const request=++datosRequest;
      state.datosSport=datoSport.dataset.datoSport;state.datosComp=null;state.datosEvent=null;state.datosEventName=null;
      datosActive('#datoSports',datoSport);datosBreadcrumb();selectSubview('datos','ligas');
      $('#datoComps').innerHTML='<div class="empty-state">Cargando ligas…</div>';
      $('#datoEvents').innerHTML='<div class="empty-state">Elige una liga para consultar sus enfrentamientos.</div>';
      $('#datoEventDetail').innerHTML='<div class="empty-state">Elige un enfrentamiento para consultar sus cuotas.</div>';
      try{
        const rows=await api(datosUrl('/api/data/competitions',{sport:state.datosSport}));
        if(request!==datosRequest)return;
        renderDatosComps(rows);
      }catch(error){if(request===datosRequest){state.datosLoaded=false;$('#datoComps').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;toast(error.message);}}
      return;
    }
    const datoComp=event.target.closest('[data-dato-comp]');
    if(datoComp){
      const request=++datosRequest;
      state.datosComp=datoComp.dataset.datoComp;state.datosEvent=null;state.datosEventName=null;
      datosActive('#datoComps',datoComp);datosBreadcrumb();selectSubview('datos','eventos');
      $('#datoEvents').innerHTML='<div class="empty-state">Cargando enfrentamientos…</div>';
      $('#datoEventDetail').innerHTML='<div class="empty-state">Elige un enfrentamiento para consultar sus cuotas.</div>';
      try{
        const rows=await api(datosUrl('/api/data/events',{sport:state.datosSport,competition:state.datosComp}));
        if(request!==datosRequest)return;
        renderDatosEvents(rows);
      }catch(error){if(request===datosRequest){state.datosLoaded=false;$('#datoEvents').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;toast(error.message);}}
      return;
    }
    const datoEvent=event.target.closest('[data-dato-event]');
    if(datoEvent){
      const request=++datosRequest;
      state.datosEvent=datoEvent.dataset.datoEvent;state.datosEventName=datoEvent.dataset.datoName;
      datosActive('#datoEvents',datoEvent);datosBreadcrumb(datoEvent.dataset.datoName);selectSubview('datos','cuotas');
      $('#datoEventDetail').innerHTML='<div class="empty-state">Cargando cuotas…</div>';
      try{
        const rows=await api(datosUrl(`/api/data/event/${encodeURIComponent(state.datosEvent)}`));
        if(request!==datosRequest)return;
        renderDatosOdds(rows);
      }catch(error){if(request===datosRequest){state.datosLoaded=false;$('#datoEventDetail').innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;toast(error.message);}}
      return;
    }
    const summary=event.target.closest('.country-summary');if(summary){const card=summary.closest('.country-card');const open=card.classList.toggle('open');summary.setAttribute('aria-expanded',open);if(open)state.expanded.add(card.dataset.country);else state.expanded.delete(card.dataset.country);return;}
    const button=event.target.closest('[data-action]');if(!button)return;
    if(button.dataset.action==='change-file'){try{const data=await api(`/api/changes/file/${encodeURIComponent(button.dataset.id)}`);$('#dialogTitle').textContent='Recorded change file';$('#dialogBody').innerHTML=`<pre>${esc(JSON.stringify(data,null,2))}</pre>`;$('#detailsDialog').showModal();}catch(error){toast(error.message);}return;}
    if(button.dataset.action==='open-country'){const country=button.dataset.country;if(openingCountries.has(country))return;openingCountries.add(country);countryOpenResults.delete(country);countries(state.countries);try{const result=await openCountryExpress(country);countryOpenResults.set(country,result.message);toast(`${result.name}: ${result.opened} ${result.opened===1?'página abierta':'páginas abiertas'} · Express`);}catch(error){countryOpenResults.set(country,error.message);toast(error.message);}finally{openingCountries.delete(country);countries(state.countries);}return;}
    button.disabled=true;
    document.querySelectorAll('#brandList [data-action="run"],#brandList [data-action="force"]').forEach(item=>item.disabled=true);
    try{const run=await api('/api/run-country',{country:button.dataset.country,forceBrowser:button.dataset.action==='force'});toast(`${run.started} marcas en cola · ${state.countries.find(country=>country.code===button.dataset.country)?.name||button.dataset.country}`);}
    catch(error){toast(error.message);}
    finally{try{header(await api('/api/status'));}catch(error){toast(error.message);}}
  });
  function explorationControls() {
    const mode=$('#ocrMode').value, country=state.countries.find(country=>country.code===$('#ocrCountry').value);
    $('#ocrSourceField').hidden=mode!=='source';$('#ocrCountryField').hidden=mode!=='country';$('#ocrUrlField').hidden=mode!=='url';
    $('#ocrStart').textContent='Iniciar';
    $('#ocrModeHelp').textContent=mode==='country'
      ?country?`${country.brands.length} fuentes · ${country.code==='global'?'usa la VPN de las fuentes seleccionadas':`activa la VPN de ${country.name}`}.`:'Selecciona un país.'
      :'';
    $('#ocrModeHelp').hidden=mode!=='country';
    const ready=mode==='country'?Boolean(country?.brands.length):mode==='url'?Boolean($('#ocrUrl').value.trim()):Boolean($('#ocrSource').value);
    const status=state.status;
    $('#ocrStart').disabled=!ready||state.ocrStarting||state.ocrBusy||state.stopPending||Boolean(status.running||status.starting||status.busy||status.stopping);
    $('#ocrStop').disabled=state.stopPending||!collectionActive();
  }
  $('#ocrMode').onchange=()=>{explorationControls();if($('#ocrMode').value==='url')$('#ocrUrl').focus();};
  $('#ocrSource').onchange=explorationControls;$('#ocrCountry').onchange=explorationControls;$('#ocrUrl').oninput=explorationControls;
  $('#ocrUrl').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();if(!$('#ocrStart').disabled)$('#ocrStart').click();}};
  explorationControls();
  let ocrReading=false;
  async function ocrStatus() {
    if(ocrReading)return;
    ocrReading=true;
    try {
      const runs=await api('/api/ocr/status'),run=runs.find(r=>!r.finishedAt&&r.state!=='QUEUED')||runs.find(r=>!r.finishedAt)||runs.at(-1);
      const queued=runs.filter(r=>!r.finishedAt&&r.state==='QUEUED').length;
      state.ocrBusy=runs.some(r=>!r.finishedAt);explorationControls();$('#ocrStop').disabled=state.stopPending||!collectionActive();if(!run){$('#ocrProgress').textContent='Listo para iniciar.';$('#ocrProgressDetails').textContent='Sin corridas en esta sesión.';return;}
      const p=run.visualProgress;
      $('#ocrProgressDetails').textContent=`${run.source.type} · ${run.source.url} · ${run.state}${run.coverage?` · ${run.coverage.skipped} saltos · ${run.coverage.filtered} cuotas fuera de selección${run.coverage.complete?' · COBERTURA COMPLETA':' · COBERTURA PARCIAL'}`:''}${run.browserMode==='renzo'?(run.source.type==='betfair'?' · Chrome Renzo: recorrido automático de ligas, eventos y mercados':' · Chrome personal: lectura de la página actual, sin OCR ni recorrido automático'):''}${queued?` · ${queued} fuentes en cola`:''}${p?` · ${p.visited} páginas · ${p.pending} pendientes · ${p.tabsOpened} pestañas abiertas · ${p.ocrCaptures} capturas OCR · ${p.records} cuotas${p.competitionsDiscovered!==undefined?` · ${p.competitionsDiscovered} competiciones · ${p.eventsDiscovered||0} eventos · ${p.marketViews||0} mercados · ${p.failedViews||0} vistas con fallos${p.complete===false&&p.state==='COMPLETE'?' · COBERTURA PARCIAL':''}`:''} · OpenAI: ${p.visionCalls||0} llamadas / ${p.visionQuotes||0} propuestas con anclaje OCR · ${p.phase||''}${p.lastError?` · ${p.lastError}`:''}`:''}${run.reason?` · ${run.reason}`:''}`;
      const name=state.brands.find(b=>b.id===run.source.type)?.name||run.source.type;
      const phase=({RUNNING:'Recopilando',QUEUED:'En cola',PAUSED:'Necesita tu ayuda',SUCCEEDED:'Guardado',SKIPPED:'Saltado',FAILED:'No pudo completar la colección'})[run.state]||run.state;
      $('#ocrProgress').textContent=`${name} · ${phase}${p?` · ${p.records} cuotas · ${p.pending} pendientes`:''}${queued?` · ${queued} fuentes en cola`:''}${run.reason?' · Ver detalle en Ajustes':''}`;
      $('#ocrProgress').title=p?.url||run.source.url;
    } catch(error){$('#ocrProgress').textContent=error.message;}finally{ocrReading=false;}
  }
  $('#ocrStart').onclick=async()=>{
    if(!$('#ocrStart').disabled)await window.startWorkbenchExtraction();
  };
  $('#ocrStop').onclick=()=>void stopCollection().catch(()=>{});
  let visionReading=false;
  async function refreshVision(){
    if(visionReading)return;visionReading=true;
    try{const v=await api('/api/ocr/vision');state.vision=v;$('#visionToggle').disabled=!v.configured;$('#visionToggle').textContent=v.enabled?'Desactivar visión OpenAI':'Activar visión OpenAI';
      $('#visionStatus').textContent=`Visión OpenAI ${v.enabled?'ACTIVADA':'DESACTIVADA'} · ${v.model} · ${v.usage.requests} solicitudes · ${v.usage.acceptedQuotes} propuestas con evidencia OCR · ${v.usage.inputTokens} tokens de entrada / ${v.usage.outputTokens} de salida${v.usage.lastError?` · ${v.usage.lastError}`:''}. Capturas enviadas a OpenAI como respaldo. API con coste. Cuotas UNCONFIRMED hasta corroboración independiente.`;
    }catch(error){$('#visionStatus').textContent=error.message;}finally{visionReading=false;}
  }
  $('#visionToggle').onclick=async()=>{if(!state.vision)return;try{$('#visionToggle').disabled=true;await api('/api/ocr/vision',{enabled:!state.vision.enabled});}catch(error){toast(error.message);}finally{await refreshVision();}};
  $('#viewUndated').onclick=()=>{state.datosFilter='undated';$('#dataFreshnessFilter').value='undated';switchTab('datos');void loadDatos();toast('Capturas de los últimos 15 minutos; la fecha del evento sigue sin confirmar.');};
  setInterval(()=>void refreshVision(),5000);void refreshVision();
  $('#refreshAdmin').onclick=()=>location.reload();
  setInterval(()=>void ocrStatus(),2000);void ocrStatus();
  void api('/api/ocr/health').then(health=>{$('#ocrHealth').textContent=`OCR instalado: ${health.engine} · ${health.languages.join(', ')} · procesamiento local.`;}).catch(error=>{$('#ocrHealth').textContent=`OCR no disponible: ${error.message}`;});
  $('#freshnessFilter').onchange=event=>{state.freshnessFilter=event.target.value;countries(state.countries);};
  $('#dataFreshnessFilter').onchange=event=>{state.datosFilter=event.target.value;void loadDatos();};
  $('#changeFilter').onchange=event=>{state.changeFilter=event.target.value;state.page=0;changes(state.changes);};
  $('#logFilter').onchange=event=>{state.logFilter=event.target.value;logs();};
  $('#autoScroll').onchange=logs;$('#clearLogs').onclick=()=>{state.logs=[];logs();};
  $('#closeDialog').onclick=()=>$('#detailsDialog').close();$('#settingsShortcut').onclick=()=>switchTab('configuracion');
  $('#startScheduler').onclick=async()=>{try{$('#startScheduler').disabled=true;await api('/api/scheduler/start',{});toast('Scheduler started');}catch(error){toast(error.message);}finally{await refreshStatus();}};
  async function refreshStatus(){try{header(await api('/api/status'));}catch(error){header(state.status);toast(error.message);}}
  function collectionActive(){return state.ocrBusy||Boolean(state.status.running||state.status.starting||state.status.busy||state.status.stopping);}
  let stopTask=null;
  function stopCollection(){
    if(stopTask)return stopTask;
    state.stopPending=true;$('#challengeDialog').close();header(state.status);
    document.dispatchEvent(new CustomEvent('collector-stop-requested'));
    stopTask=(async()=>{
      let result;
      try{
        result=await api('/api/stop',{});toast(`Deteniendo ${result.stopped} ejecuciones y sus fuentes en cola…`);
        const deadline=Date.now()+15000;
        do{
          const status=await api('/api/status');header(status);
          if(!status.busy&&!status.running&&!status.starting&&!status.stopping){
            state.ocrBusy=false;result={...result,confirmed:true};
            toast('Captura detenida. El contenido guardado se conserva.');return result;
          }
          await new Promise(resolve=>setTimeout(resolve,250));
        }while(Date.now()<deadline);
        throw Error('La cancelación fue enviada, pero el motor aún no confirmó la detención. Puedes volver a pulsar Detener.');
      }catch(error){toast(error.message);throw error;}
      finally{
        state.stopPending=false;stopTask=null;header(state.status);
        document.dispatchEvent(new CustomEvent('collector-stop-finished',{detail:result}));
        await Promise.all([refreshStatus(),ocrStatus()]);
      }
    })();return stopTask;
  }
  window.stopCollector=stopCollection;
  $('#stopScheduler').onclick=()=>void stopCollection().catch(()=>{});
  $('#challengeStop').onclick=()=>void stopCollection().catch(()=>{});
  async function refreshStorage(){
    const label=$('#storageStatus');if(!label)return;
    try{const data=await api('/api/storage/status');
      label.textContent=!data.connected?'PostgreSQL · conexión pendiente':!data.automatic?`${data.backend} · guardado automático desactivado`:
        `${data.backend} · ${data.pending||data.errors?'sincronizando capturas':'guardado automático'} · ${number(data.captures)} capturas`;
    }catch{label.textContent='Guardado local · pendiente de verificar';}
  }
  setInterval(()=>void refreshStorage(),15000);void refreshStorage();
  // Day records: read persisted captures only (disk ∪ PostgreSQL archive); exporting never opens a source.
  const records={day:null,offset:0,limit:100,total:0,loading:false};
  const stampBkk=d=>d?new Date(d).toLocaleString('es-ES',{timeZone:'Asia/Bangkok',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  function openRecordsDialog(){const dialog=$('#recordsDialog');if(!$('#recordsDate').value)$('#recordsDate').value=state.status.today||'';if(!dialog.open)dialog.showModal();if(!records.day||records.day!==$('#recordsDate').value)void loadRecords(0);}
  async function loadRecords(offset,force){
    if(records.loading&&!force)return;const day=$('#recordsDate').value;if(!day){$('#recordsStatus').textContent='Elige un día.';return;}
    records.loading=true;$('#recordsStatus').textContent=`Consultando registros del ${day}…`;$('#recordsLoad').disabled=true;$('#recordsExport').disabled=true;
    try{
      const data=await api(`/api/records/day?date=${encodeURIComponent(day)}&offset=${offset}&limit=${records.limit}`);
      records.day=day;records.offset=data.offset;records.total=data.validatedTotal;const s=data.summary;
      $('#recordsSummary').innerHTML=`<span><b>${number(s.validated)}</b> cuotas validadas</span><span><b>${number(s.pending)}</b> pendientes</span><span><b>${number(s.captures)}</b> capturas</span><span>${s.archiveAvailable?'Archivo PostgreSQL consultado':'Archivo PostgreSQL no disponible · solo RAW en disco'}</span>`;
      $('#recordsScope').textContent=`${s.scope} Procedencia: ${s.origins.both} en disco y archivo · ${s.origins.local} solo en disco · ${s.origins.archive} solo en archivo.${s.archiveError?` Error del archivo: ${s.archiveError}`:''}`;
      $('#recordsRows').innerHTML=data.validated.length?data.validated.map(r=>`<tr><td title="${esc(r.captureId)}">${esc(stampBkk(r.capturedAt))}<br><small>${esc(r.method)}${r.transport?` · ${esc(r.transport)}`:''}</small></td><td>${esc(r.source)}${r.bookmaker&&r.bookmaker!==r.source?`<br><small>${esc(r.bookmaker)}</small>`:''}<br><small title="${esc(r.pageUrl)}">${esc(r.pageUrl.replace(/^https?:\/\//,'').slice(0,48))}</small></td><td>${esc(r.competitionCountry||'—')}<br><small>${esc(r.league||'Liga por confirmar')}</small></td><td>${esc(r.event)}${r.eventStart?`<br><small>${esc(stampBkk(r.eventStart))}</small>`:''}</td><td>${esc(r.market)}${r.period?` · ${esc(r.period)}`:''}${r.line?` · ${esc(r.line)}`:''}<br><b>${esc(r.selection)}</b></td><td><strong>${esc(r.rawOdds||r.decimalOdds)}</strong><br><small>${esc(r.oddsFormat||'')}</small></td><td>${r.status==='VALID'?'Validada':r.status==='IA'?'Extraída con IA · verificada en el texto':'Validada · metadatos parciales'}<br><small>${esc(r.reason)}</small></td></tr>`).join('')
        :`<tr><td class="empty-state" colspan="7">${s.captures?'Hay capturas de este día, pero ninguna cuota validada. Revisa los pendientes.':'No hay capturas guardadas con fecha de captura en este día.'}</td></tr>`;
      $('#recordsPendingCount').textContent=s.pending?`· ${number(s.pending)}`:'';
      $('#recordsPendingRows').innerHTML=data.pending.length?data.pending.map(p=>`<tr><td title="${esc(p.captureId)}">${esc(stampBkk(p.capturedAt))}</td><td>${esc(p.source)}<br><small title="${esc(p.pageUrl)}">${esc(p.pageUrl.replace(/^https?:\/\//,'').slice(0,48))}</small></td><td>${esc(({record:'Registro ambiguo',text:'Texto sin interpretar',capture:'Captura sin registros'})[p.kind]||p.kind)}${p.row!=null?` · fila ${p.row+1}`:''}${p.textChars?` · ${number(p.textChars)} caracteres`:''}</td><td>${esc(p.reason)}</td></tr>`).join('')+(data.pendingTotal>data.pending.length?`<tr><td colspan="4">… ${number(data.pendingTotal-data.pending.length)} pendientes más en la exportación.</td></tr>`:'')
        :'<tr><td class="empty-state" colspan="4">Sin pendientes.</td></tr>';
      const page=Math.floor(records.offset/records.limit)+1,pages=Math.max(1,Math.ceil(records.total/records.limit));
      $('#recordsPageLabel').textContent=records.total?`Filas ${records.offset+1}–${Math.min(records.total,records.offset+records.limit)} de ${number(records.total)} · página ${page}/${pages}`:'';
      $('#recordsPrev').disabled=records.offset===0;$('#recordsNext').disabled=records.offset+records.limit>=records.total;
      $('#recordsStatus').textContent=`${day}: ${number(s.validated)} cuotas validadas en ${number(s.captures)} capturas · ${number(s.pending)} pendientes. La exportación incluye todas las filas, sin paginar.`;
      $('#recordsExport').disabled=!(s.validated||s.pending||s.captures);
      void loadAi();
    }catch(error){$('#recordsStatus').textContent=`No se pudieron leer los registros: ${error.message}`;}
    finally{records.loading=false;$('#recordsLoad').disabled=false;}
  }
  async function exportRecords(){
    const day=$('#recordsDate').value;if(!day)return;$('#recordsExport').disabled=true;$('#recordsStatus').textContent=`Exportando registros del ${day}…`;
    try{const result=await api('/api/records/export',{date:day});const s=result.summary;
      $('#recordsExportResult').innerHTML=`<p><b>Exportado:</b> ${number(s.validated)} validadas · ${number(s.pending)} pendientes · ${number(s.captures)} capturas.</p><p>CSV validadas: <code>${esc(result.files.validatedCsv)}</code></p><p>CSV pendientes: <code>${esc(result.files.pendingCsv)}</code></p><p>JSON completo: <code>${esc(result.files.json)}</code></p><button class="small-button" data-reveal="${esc(result.files.json)}" type="button">Mostrar en Finder</button>`;
      $('#recordsExportResult').querySelector('[data-reveal]').onclick=async event=>{try{await api('/api/records/reveal',{path:event.currentTarget.dataset.reveal});}catch(error){toast(error.message);}};
      $('#recordsStatus').textContent=`Exportación del ${day} guardada en ${result.folder}.`;toast('Registros exportados en CSV y JSON');
    }catch(error){$('#recordsStatus').textContent=`No se pudo exportar: ${error.message}`;}
    finally{$('#recordsExport').disabled=false;}
  }
  // AI extraction of saved text: start-then-poll, because the AI call can take longer than api()'s 15s timeout.
  const recordsAi={timer:null,available:false,pending:0,running:false};
  const stopAiPolling=()=>{if(recordsAi.timer){clearInterval(recordsAi.timer);recordsAi.timer=null;}};
  function paintAi(info){
    const job=info.job,running=Boolean(job&&job.running);recordsAi.running=running;recordsAi.available=info.available;recordsAi.pending=info.pendingCaptures;
    $('#recordsAiRun').disabled=running||!info.available||!info.evidenceCaptures;$('#recordsAiRun').textContent=info.pendingCaptures||!info.reviewedCaptures?'Extraer con IA':'Volver a extraer con IA';$('#recordsAiCancel').hidden=!running;$('#recordsAiBar').hidden=!running;
    if(running){const pct=job.total?Math.round(job.done/job.total*100):0;$('#recordsAiFill').style.width=`${pct}%`;
      $('#recordsAiStatus').textContent=`IA: ${job.current||'…'} · ${job.done}/${job.total} capturas · ${job.reachedModel} llegaron al modelo · texto ${job.textCaptures}, DOM ${job.domCaptures}, visión ${job.imageCaptures} · ${number(job.accepted)} verificadas · ${number(job.rejected)} rechazadas.`;return;}
    if(job&&job.finishedAt&&job.day===info.day){
      const base=job.cancelled?'Cancelado.':job.error?`Error: ${job.error}`:'Terminado.';
      $('#recordsAiStatus').textContent=`${base} ${job.reachedModel}/${job.total} capturas recibieron respuesta · envíos por texto ${job.textCaptures}, DOM ${job.domCaptures}, visión ${job.imageCaptures} · ${number(job.proposed)} propuestas · ${number(job.accepted)} verificadas · ${number(job.rejected)} rechazadas · ${number(Math.max(0,job.proposed-job.accepted-job.rejected))} sin finalizar · ${number(job.duplicates)} duplicados · ${number(job.newRows)} nuevas · total ${job.finalTotal==null?'sin finalizar':number(job.finalTotal)}.`;
      let report=$('#recordsAiReport');if(!report){report=document.createElement('details');report.id='recordsAiReport';$('#recordsAi').after(report);}
      report.innerHTML=`<summary>Detalle por captura y motivos de rechazo</summary>${job.captures.map(c=>`<p><b>${esc(c.source)}</b> · ${esc(c.captureId)}<br>${esc(c.routes.join(' / ')||'Sin envío')} · ${c.proposed} propuestas · ${c.accepted} verificadas · ${c.rejected} rechazadas · ${c.newRows} nuevas${c.skipped?`<br>${esc(c.skipped)}`:''}${c.error?`<br>Error: ${esc(c.error)}`:''}${Object.entries(c.reasons).map(([reason,count])=>`<br>${count}: ${esc(reason)}`).join('')}</p>`).join('')}`;return;}
    $('#recordsAiStatus').textContent=!info.available?`IA no disponible: ${info.reason}`:`${info.totalCaptures} capturas: ${info.evidenceCaptures} con evidencia utilizable (texto, registros estructurados, DOM o imagen), ${info.imageCaptures} con imagen real; ${info.noEvidenceCaptures} sin evidencia guardada. ${info.pendingCaptures} sin revisar. Se usa OpenAI (${info.model}); el precio se verifica y se deduplica después.`;
  }
  async function loadAi(){
    const day=$('#recordsDate').value;if(!day)return;
    try{const info=await api(`/api/records/ai?date=${encodeURIComponent(day)}`);paintAi(info);
      if(info.job.running&&!recordsAi.timer)recordsAi.timer=setInterval(()=>void pollAi(),1500);
      return info;}catch(error){$('#recordsAiStatus').textContent=`No se pudo consultar la IA: ${error.message}`;}
  }
  async function pollAi(){
    const info=await loadAi();
    if(info&&!info.job.running){stopAiPolling();await loadRecords(0,true);if(info.job.finishedAt)toast(info.job.error?'La extracción con IA terminó con error':`IA: ${info.job.accepted} cuotas validadas`);}
  }
  async function runAi(){
    const day=$('#recordsDate').value;if(!day)return;$('#recordsAiRun').disabled=true;
    try{await api('/api/records/ai',{date:day,again:!recordsAi.pending});await loadAi();if(!recordsAi.timer)recordsAi.timer=setInterval(()=>void pollAi(),1500);}
    catch(error){$('#recordsAiStatus').textContent=`No se pudo iniciar la IA: ${error.message}`;await loadAi();}
  }
  async function cancelAi(){try{await api('/api/records/ai/cancel',{});$('#recordsAiStatus').textContent='Cancelando…';}catch(error){toast(error.message);}}
  $('#recordsAiRun').onclick=()=>void runAi();$('#recordsAiCancel').onclick=()=>void cancelAi();
  $('#exportRecords').onclick=openRecordsDialog;$('#recordsClose').onclick=()=>{stopAiPolling();$('#recordsDialog').close();};
  $('#recordsLoad').onclick=()=>void loadRecords(0);$('#recordsExport').onclick=()=>void exportRecords();
  $('#recordsToday2').onclick=()=>{$('#recordsDate').value=state.status.today||'';void loadRecords(0);};
  $('#recordsDate').onchange=()=>{records.day=null;$('#recordsExportResult').innerHTML='';};
  $('#recordsPrev').onclick=()=>void loadRecords(Math.max(0,records.offset-records.limit));$('#recordsNext').onclick=()=>void loadRecords(records.offset+records.limit);
  $('#settingsForm').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.currentTarget);try{state.settings=await api('/api/settings',Object.fromEntries(['intervalMinutes','timeoutSeconds','delaySeconds'].map(key=>[key,Number(form.get(key))])));$('#settingsSaved').textContent='Saved. Applies to the next run or scheduler start.';toast('Settings saved');}catch(error){toast(error.message);}};
  const pagination=document.createElement('div');pagination.className='pagination';pagination.innerHTML='<button class="small-button" id="prevPage">Previous</button><span id="pageLabel"></span><button class="small-button" id="nextPage">Next</button>';$('#panel-cambios .table-card').append(pagination);
  $('#prevPage').onclick=()=>{state.page--;changes(state.changes);};$('#nextPage').onclick=()=>{state.page++;changes(state.changes);};
  async function init(){try{const [status,items,movements,settings,groups]=await Promise.all([api('/api/status'),api('/api/brands'),api('/api/changes/today'),api('/api/settings'),api('/api/countries')]);header(status);brands(items);countries(groups);changes(movements);state.settings=settings;Object.entries(settings).forEach(([key,value])=>$(`[name="${key}"]`).value=value);}catch(error){toast(error.message);$('#updatedAt').textContent='No se pudieron leer los datos locales';}}
  switchTab('coleccion','extraer');
  void init();
  const events=new EventSource('/api/stream');
  window.collectorEvents=events;
  events.addEventListener('open',()=>{$('#logConnection').textContent='CONECTADO';});
  events.addEventListener('error',()=>{$('#logConnection').textContent='RECONECTANDO';$('#updatedAt').textContent='Reconectando con el colector…';});
  events.addEventListener('log_line',event=>addLog(JSON.parse(event.data)));
  events.addEventListener('status_update',event=>{const status=JSON.parse(event.data);header(status);if(status.changes)changes(status.changes);});
  events.addEventListener('source_update',event=>brands(JSON.parse(event.data)));
  events.addEventListener('country_update',event=>countries(JSON.parse(event.data)));
  events.addEventListener('data_update',scheduleDatosRefresh);
})();
