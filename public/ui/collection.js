(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const split = text => text.split(',').map(v => v.trim()).filter(Boolean);
  const stamp = date => date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString('es-ES', { timeZone: 'Asia/Bangkok' }) : 'Fecha desconocida';
  const defaults = {scope:'site',sectionUrl:'',urls:[],tabs:[],sports:[],leagues:[],markets:[],from:'',to:'',timezone:'Asia/Bangkok',excludePast:true,resume:true,refreshMinutes:15,budgetMinutes:30,maxPages:200,maxVisionCalls:20,textOnly:true};
  let inventory = null, sourceKey = '', version = 0, offset = 0, history = null, historyBusy = false, skipSource = null;
  let savedUrls = [], savedTabs = [], historyVersion = 0;
  const reviewed = new Set();
  window.captureReview = () => ({ source: $('#collectionHistorySource').value === 'all' ? undefined : JSON.parse($('#collectionHistorySource').value), captureIds: reviewed.size ? [...reviewed].sort() : undefined });
  const reviewChanged = () => document.dispatchEvent(new Event('capture-review-changed'));
  function changeReviewSource(value) { $('#collectionHistorySource').value=value; $('#workbenchHistorySource').value=value; reviewed.clear(); offset=0; reviewChanged(); void loadHistory(); }
  $('#workbenchHistorySource').onchange=event=>changeReviewSource(event.target.value);
  async function api(path, body, timeout=15000) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
    try { const response = await fetch(path, body === undefined ? {signal:controller.signal} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      const result = await response.json(); if(!response.ok)throw new Error(result.error || `HTTP ${response.status}`);return result;
    } finally { clearTimeout(timer); }
  }
  function target() {
    const mode = $('#ocrMode').value;
    if(mode==='country')return null;
    if(mode==='source')return $('#ocrSource').value ? JSON.parse($('#ocrSource').value) : null;
    const raw=$('#ocrUrl').value.trim();if(!raw)return null;
    const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(raw)?raw:`https://${raw}`);
    if(!['http:','https:'].includes(url.protocol))throw Error('Pega una URL HTTP o HTTPS.');
    const catalog=[...$('#ocrSource').options].map(o=>{try{return JSON.parse(o.value);}catch{return null;}}).filter(Boolean);
    const known=catalog.find(s=>new URL(s.url).hostname.replace(/^www\./,'')===url.hostname.replace(/^www\./,''));
    return {url:url.href,type:known?.type||`custom-${url.hostname.replace(/^www\./,'').replace(/[^a-z\d.-]/g,'-')}`};
  }
  function options() {
    const urls=$('#collectionLimitPages')?.checked ? [...document.querySelectorAll('[data-collection-page]:checked')].map(c=>c.value) : [];
    const tabs=$('#collectionLimitTabs')?.checked ? [...document.querySelectorAll('[data-collection-tab]:checked')].map(c=>c.value) : [];
    if($('#collectionLimitPages')?.checked&&!urls.length)throw Error('Selecciona al menos una página o desactiva «Solo páginas seleccionadas».');
    if($('#collectionLimitTabs')?.checked&&!tabs.length)throw Error('Selecciona al menos una pestaña o desactiva «Solo pestañas seleccionadas».');
    return {...defaults,textOnly:$('#collectionReadMode').value==='text',scope:$('#collectionScope').value,sectionUrl:$('#collectionSection').value.trim(),urls:inventory?urls:savedUrls,tabs:inventory?tabs:savedTabs,
      sports:split($('#collectionSports').value),leagues:split($('#collectionLeagues').value),markets:[...document.querySelectorAll('[name="collectionMarket"]:checked')].map(c=>c.value),
      from:$('#collectionFrom').value,to:$('#collectionTo').value,excludePast:$('#collectionPast').checked,resume:$('#collectionResume').checked,
      refreshMinutes:Number($('#collectionRefresh').value),budgetMinutes:Number($('#collectionBudget').value),maxPages:Number($('#collectionPages').value),maxVisionCalls:Number($('#collectionCalls').value)};
  }
  let countryCustomized=false, profileSaved=false;
  window.collectorControls={options,target,forRun:()=>$('#ocrMode').value==='country'&&!countryCustomized&&$('#collectionReadMode').value!=='text'?undefined:options()};
  function selectionSummary() {
    const label=$('#collectionSelectionSummary');
    if($('#ocrMode').value==='country'&&!countryCustomized&&$('#collectionReadMode').value!=='text'){label.textContent='Automático · cada fuente conserva su selección y sus pendientes';return;}
    try {
      const o=options(), parts=[o.textOnly?'scroll y copiar texto · sin screenshots':'capturas como respaldo'];
      if(o.scope!=='site')parts.push(o.scope==='url'?'solo esta URL':'solo esta sección');
      if(o.from||o.to)parts.push(`fechas: ${o.from||'sin inicio'} → ${o.to||'sin fin'}`);
      if(o.sports.length)parts.push(o.sports.join(', '));if(o.leagues.length)parts.push(o.leagues.join(', '));
      if(o.markets.length)parts.push(`${o.markets.length} mercados`);
      if(o.urls.length)parts.push(`${o.urls.length} páginas`);if(o.tabs.length)parts.push(`${o.tabs.length} pestañas`);
      if(!o.excludePast)parts.push('incluye historial');if(!o.resume)parts.push('sin reanudar');
      if(['budgetMinutes','maxPages','maxVisionCalls','refreshMinutes'].some(k=>o[k]!==defaults[k]))parts.push('límites personalizados');
      label.textContent=parts.length?`${profileSaved?'Selección guardada':'Selección personalizada'} · ${parts.join(' · ')}`:'Automático · evita repetir trabajo reciente y continúa lo pendiente';
    }catch(error){label.textContent=error.message;}
  }
  function status(text) { $('#collectionPlanStatus').textContent=text; }
  function readHelp() {
    if(window.collectorScrollModeUI){window.collectorScrollModeUI();return;}
    $('#collectionReadHelp').textContent=$('#collectionScrollMode').value==='manual'?'Tú haces scroll. La barra flotante captura automáticamente lo visible o la zona seleccionada y permite pausar, guardar y terminar.':$('#collectionReadMode').value==='text'?'El programa hace scroll y guarda texto automáticamente. Sin screenshots, OCR ni visión. Si una página solo ofrece imágenes, queda pendiente.':'Primero datos y texto; usa screenshots y OCR solo si hacen falta.';
  }
  function apply(value) {
    const o={...defaults,...value};savedUrls=o.urls;savedTabs=o.tabs;
    for(const [id,key] of [['Scope','scope'],['Section','sectionUrl'],['From','from'],['To','to'],['Budget','budgetMinutes'],['Pages','maxPages'],['Calls','maxVisionCalls'],['Refresh','refreshMinutes']])$('#collection'+id).value=o[key];
    $('#collectionSports').value=o.sports.join(', ');$('#collectionLeagues').value=o.leagues.join(', ');
    $('#collectionPast').checked=o.excludePast;$('#collectionResume').checked=o.resume;
    readHelp();
    document.querySelectorAll('[name="collectionMarket"]').forEach(c=>c.checked=o.markets.includes(c.value));
    $('#collectionSection').disabled=o.scope!=='section';
    selectionSummary();
  }
  function renderInventory() {
    const box=$('#collectionInventory');box.hidden=!inventory;if(!inventory)return;
    const pages=[...inventory.pages];for(const url of savedUrls)if(!pages.some(p=>p.url===url))pages.push({url,label:'Selección guardada · fuera del inventario actual'});
    const tabs=[...inventory.tabs];for(const label of savedTabs)if(!tabs.some(t=>t.label===label))tabs.push({label});
    box.innerHTML=`<p>Inventario observado el ${esc(stamp(inventory.capturedAt))}. Descubrir solo lee esta página; no inicia el recorrido.</p><div class="collection-grid"><div><label><input id="collectionLimitPages" type="checkbox" ${savedUrls.length?'checked':''}> Solo páginas seleccionadas</label><div class="collection-checklist">${pages.map(p=>`<label><input data-collection-page type="checkbox" value="${esc(p.url)}" ${!savedUrls.length||savedUrls.includes(p.url)?'checked':''}><span>${esc(p.label)}<small>${esc(p.url)}</small></span><button type="button" class="small-button" data-skip-page="${esc(p.url)}">Saltar</button></label>`).join('')||'<p>No hay enlaces deportivos observados.</p>'}</div></div><div><label><input id="collectionLimitTabs" type="checkbox" ${savedTabs.length?'checked':''}> Solo pestañas seleccionadas</label><div class="collection-checklist">${tabs.map(t=>`<label><input data-collection-tab type="checkbox" value="${esc(t.label)}" ${!savedTabs.length||savedTabs.includes(t.label)?'checked':''}><span>${esc(t.label)}</span><button type="button" class="small-button" data-skip-tab="${esc(t.label)}">Saltar</button></label>`).join('')||'<p>No hay pestañas deportivas observadas.</p>'}</div></div></div>`;
  }
  async function loadProfile() {
    const serial=++version;let source;try{source=target();}catch{return;}
    sourceKey=source?JSON.stringify(source):'';inventory=null;savedUrls=[];savedTabs=[];countryCustomized=false;profileSaved=false;renderInventory();
    $('#collectionDiscover').disabled=!source;$('#collectionSave').disabled=!source;$('#collectionSkip').disabled=!source;
    if(!source){apply(defaults);status('Las preferencias del país se aplican a cada fuente. Selecciona una fuente o URL para descubrir páginas y guardar un perfil.');return;}
    apply({...defaults,scope:$('#ocrMode').value==='url'?'url':'site'});
    try{const result=await api('/api/collection/profile?'+new URLSearchParams(source));if(serial!==version)return;
      profileSaved=result.saved;if(result.saved)apply(result.options);inventory=result.inventory;renderInventory();selectionSummary();status(result.saved?'Selección guardada recuperada. Se aplicará a la siguiente corrida.':'Puedes iniciar sin cambiar nada. Guarda una selección solo si quieres limitar lo que se copia.');
    }catch(error){if(serial===version)status(error.message);}
  }
  $('#collectionScope').onchange=()=>{$('#collectionSection').disabled=$('#collectionScope').value!=='section';};
  $('#collectionControls').addEventListener('input',()=>{countryCustomized=true;profileSaved=false;selectionSummary();});
  $('#collectionControls').addEventListener('change',()=>{countryCustomized=true;profileSaved=false;selectionSummary();});
  try{const mode=localStorage.getItem('collector_read_mode');if(mode==='text'||mode==='auto')$('#collectionReadMode').value=mode;}catch{}
  $('#collectionReadMode').onchange=()=>{try{localStorage.setItem('collector_read_mode',$('#collectionReadMode').value);}catch{}countryCustomized=true;profileSaved=false;selectionSummary();readHelp();};
  $('#collectionCustomize').onclick=()=>{
    const source=target();$('#collectionOptionsSource').textContent=source?`${source.type} · ${source.url}`:'Selección común para las fuentes del país';$('#collectionOptionsDialog').showModal();
  };
  $('#collectionOptionsClose').onclick=()=>$('#collectionOptionsDialog').close();
  $('#collectionReset').onclick=()=>{inventory=null;profileSaved=false;countryCustomized=false;apply({...defaults,scope:$('#ocrMode').value==='url'?'url':'site'});renderInventory();selectionSummary();status('Automático restablecido. Guarda si quieres reemplazar la selección anterior.');};
  for(const id of ['ocrMode','ocrSource','ocrCountry'])$('#'+id).addEventListener('change',()=>void loadProfile());
  let profileTimer;$('#ocrUrl').addEventListener('input',()=>{clearTimeout(profileTimer);profileTimer=setTimeout(()=>void loadProfile(),450);});
  $('#collectionSave').onclick=async()=>{try{const source=target();if(!source)throw Error('Selecciona una fuente o URL.');await api('/api/collection/profile',{source,options:options()});profileSaved=true;selectionSummary();status('Selección guardada para las próximas corridas.');$('#collectionOptionsDialog').close();}catch(error){status(error.message);}};
  $('#collectionDiscover').onclick=async()=>{
    const button=$('#collectionDiscover');button.disabled=true;
    try{const source=target();if(!source)throw Error('Selecciona una fuente o URL.');const serial=version;status('Descubriendo enlaces y controles de la fuente…');
      const result=await api('/api/collection/discover',{source},40000);if(serial!==version)return;
      inventory=result;renderInventory();status(`${result.pages.length} páginas y ${result.tabs.length} controles descubiertos. Puedes seleccionar o saltar cada uno.`);
    }catch(error){status(error.message);}finally{button.disabled=false;}
  };
  $('#collectionPlan').onclick=async()=>{try{const source=target(),o=options();const result=source?await api('/api/collection/plan',{source,options:o}):null;
    status(`${o.scope==='url'?'Solo la URL exacta':o.scope==='section'?'Solo la sección':'Sitio completo'} · ${o.urls.length?`${o.urls.length} páginas seleccionadas`:'enlaces dentro del alcance'} · ${o.tabs.length?`${o.tabs.length} pestañas`:'pestañas permitidas'} · ${o.budgetMinutes} min · ${o.maxPages} vistas · hasta ${o.maxVisionCalls} llamadas IA${result?` · ${result.rules} reglas activas · ${result.pending} vistas pendientes guardadas`:''}. ${o.resume?'Reanudación activada.':'Nueva corrida.'}`);
  }catch(error){status(error.message);}};
  function openSkip(source,kind='source',value='') {
    if(!source){status('Selecciona una fuente o URL para aplicar el salto.');return;}skipSource=source;
    $('#collectionSkipSource').textContent=`${source.type} · ${source.url}`;$('#collectionSkipKind').value=kind;$('#collectionSkipValue').value=value;$('#collectionSkipError').textContent='';skipFields();$('#collectionSkipDialog').showModal();
  }
  function skipFields() {const kind=$('#collectionSkipKind').value;$('#collectionSkipValueField').hidden=kind==='source';$('#collectionSkipValue').type=kind==='date'?'date':kind==='url'?'url':'text';$('#collectionSkipUntilField').hidden=$('#collectionSkipDuration').value!=='until';}
  $('#collectionSkip').onclick=()=>{try{openSkip(target());}catch(error){status(error.message);}};
  $('#collectionSkipKind').onchange=skipFields;$('#collectionSkipDuration').onchange=skipFields;
  $('#collectionSkipClose').onclick=()=>$('#collectionSkipDialog').close();
  $('#collectionSkipForm').onsubmit=async event=>{event.preventDefault();try{
    const duration=$('#collectionSkipDuration').value;let until=null;
    if(duration==='tomorrow'){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const date=['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');until=new Date(Date.parse(date+'T00:00:00+07:00')+86400000).toISOString();}
    if(duration==='until'){const value=$('#collectionSkipUntil').value;if(!value)throw Error('Selecciona cuándo reactivar.');until=new Date(value+':00+07:00').toISOString();}
    await api('/api/collection/skip',{source:skipSource,rule:{kind:$('#collectionSkipKind').value,value:$('#collectionSkipValue').value.trim(),duration:duration==='tomorrow'?'until':duration,until}});
    $('#collectionSkipDialog').close();status('Salto guardado y aplicado a las tareas pendientes.');await loadHistory();
  }catch(error){$('#collectionSkipError').textContent=error.message;}};
  document.addEventListener('click',event=>{const source=event.target.closest('[data-collection-source-skip]'),page=event.target.closest('[data-skip-page]'),tab=event.target.closest('[data-skip-tab]');try{if(source)openSkip(JSON.parse(source.dataset.collectionSourceSkip));if(page)openSkip(target(),'url',page.dataset.skipPage);if(tab)openSkip(target(),'tab',tab.dataset.skipTab);}catch(error){status(error.message);}});
  const ingestionNames={PENDING:'Pendiente de carga',LOADED:'Cargado',FAILED:'Fallo · reintento automático',UNKNOWN:'Carga anterior sin verificar',EMPTY:'Sin registros para cargar'};
  async function loadHistory() {
    const serial=++historyVersion;historyBusy=true;
    try{
      const source=$('#collectionHistorySource').value;const params=new URLSearchParams({offset:String(offset)});if(source!=='all'){const parsed=JSON.parse(source);params.set('type',parsed.type);params.set('url',parsed.url);}
      const result=await api('/api/collection/state?'+params);if(serial!==historyVersion)return;history=result;
      const picker=$('#collectionHistorySource'),selected=picker.value;
      picker.innerHTML='<option value="all">Todas</option>'+result.sources.map(s=>`<option value="${esc(JSON.stringify(s))}">${esc(s.type)} · ${esc(s.url)}</option>`).join('');picker.value=selected;if(!picker.value)picker.value='all';$('#workbenchHistorySource').innerHTML=picker.innerHTML;$('#workbenchHistorySource').value=picker.value;
      $('#collectionDirectory').textContent='Archivos guardados en este dispositivo';$('#collectionDirectory').title=result.dataDirectory;
      $('#collectionTotals').textContent='';$('#collectionTotals').hidden=true;
      const galleryHtml=result.captures.map(c=>`<article class="capture-preview"><label><input type="checkbox" data-review-capture="${esc(c.id)}" ${reviewed.has(c.id)?'checked':''}> Ordenar este archivo</label><button type="button" data-collection-capture="${esc(c.id)}" class="capture-open" aria-label="${esc(c.source.type)} · ${esc(stamp(c.capturedAt))} · ${c.images.length?'Ver captura de pantalla':'Ver texto y datos'}">${c.images.length?`<img loading="lazy" src="/api/collection/capture/${encodeURIComponent(c.id)}/image/${encodeURIComponent(c.images[0])}" alt="Captura guardada de ${esc(c.source.type)}"><span>Ver captura de pantalla</span>`:'<div class="capture-text-preview">Texto / datos</div><span>Ver texto y datos guardados</span>'}</button><p><strong>${esc(c.source.type)}</strong> · ${esc(stamp(c.capturedAt))}</p></article>`).join('')||'<p>Aún no hay capturas ni texto guardados. Pulsa Extraer para empezar.</p>';if($('#collectionGallery').innerHTML!==galleryHtml)$('#collectionGallery').innerHTML=galleryHtml;
      $('#collectionCheckpoints').innerHTML=result.checkpoints.map((c,i)=>{const pending=c.betfair?c.betfair.pending.length+Number(Boolean(c.betfair.active)):c.crawl?.pending.length||0;const complete=c.state==='COMPLETE';const views=c.views||[];return `<article class="collection-card"><strong>${esc(c.source.type)} · ${complete?'Completo en el alcance seleccionado':'Pendiente / parcial'}</strong><p>${esc(c.source.url)}</p><p>${views.filter(v=>v.status==='COMPLETE').length} vistas completas · ${pending} pendientes · ${views.filter(v=>v.status==='SKIPPED').length} saltos · ${esc(stamp(c.updatedAt))}</p>${c.reason?`<p>${esc(c.reason)}</p>`:''}<button class="small-button" data-collection-resume="${i}">${complete?'Actualizar cuotas':'Reanudar pendientes'}</button><button class="small-button" data-collection-skip="${i}">Saltar fuente</button><details><summary>Ver lo recorrido y omitido</summary><ul>${views.slice(-50).map(v=>`<li>${esc(({COMPLETE:'Completo',PARTIAL:'Parcial',SKIPPED:'Saltado',FAILED:'Fallo'})[v.status]||v.status)} · ${esc(v.label||v.url)}${v.reason?` · ${esc(v.reason)}`:''}</li>`).join('')}</ul></details></article>`;}).join('')||'<p>Aún no hay recorridos guardados. Las próximas corridas registrarán su progreso automáticamente.</p>';
      $('#collectionRules').innerHTML=result.rules.map(rule=>`<article class="collection-card"><strong>${esc(rule.source.type)} · ${esc(({source:'Fuente',url:'URL',league:'Liga',sport:'Deporte',market:'Mercado',tab:'Pestaña',date:'Fecha'})[rule.kind])}</strong><p>${esc(rule.value||rule.source.url)} · ${rule.duration==='forever'?'Hasta reactivar':rule.duration==='until'?`Hasta ${esc(stamp(rule.until))}`:rule.runId?'Solo corrida asignada':'Próxima corrida'}</p><button class="small-button" data-collection-reactivate="${esc(rule.id)}">Reactivar</button></article>`).join('')||'<p>No hay exclusiones guardadas.</p>';
      $('#collectionCoverage').innerHTML=`<table><thead><tr><th>FUENTE / LIGA</th><th>FECHA DEL EVENTO</th><th>MERCADO</th><th>COBERTURA</th></tr></thead><tbody>${result.coverage.map(c=>`<tr><td>${esc(c.source.type)} / ${esc(c.league)}</td><td>${esc(c.date)}</td><td>${esc(c.market)}</td><td>${c.archived?'Completo · eventos terminados':c.complete?'Vista completa · cuotas actualizables':'Parcial'}</td></tr>`).join('')||'<tr><td colspan="4">Sin cobertura registrada todavía.</td></tr>'}</tbody></table>`;
      $('#collectionReceipts').innerHTML=result.captures.map((c,i)=>`<tr><td>${esc(stamp(c.capturedAt))}<br><small>${esc(c.method)}${c.summary?' · resumen':''}</small></td><td>${esc(c.source.type)}<small class="collection-url">${esc(c.url)}</small></td><td>${c.records} registros<small class="collection-url">${esc(c.groups.slice(0,3).map(g=>`${g.league} / ${g.date} / ${g.market}`).join(' · '))}</small></td><td title="${esc(c.error||'')}">${esc(ingestionNames[c.ingestion]||c.ingestion)}</td><td><button class="small-button" data-collection-capture="${esc(c.id)}">Ver datos${c.images.length?' y captura':''}</button><button class="small-button" data-receipt-skip="${i}">Saltar…</button></td></tr>`).join('')||'<tr><td colspan="5">Sin capturas para esta fuente.</td></tr>';
      $('#collectionPageLabel').textContent=`${result.total?offset+1:0}–${Math.min(offset+30,result.total)} de ${result.total}`;$('#collectionPrev').disabled=offset===0;$('#collectionNext').disabled=offset+30>=result.total;
    }catch(error){$('#collectionTotals').hidden=false;$('#collectionTotals').textContent=error.message;}finally{historyBusy=false;}
  }
  $('#collectionReload').onclick=()=>void loadHistory();$('#collectionHistorySource').onchange=event=>changeReviewSource(event.target.value);
  $('#collectionGallery').addEventListener('change',event=>{if(!event.target.matches('[data-review-capture]'))return;const id=event.target.dataset.reviewCapture;if(event.target.checked)reviewed.add(id);else reviewed.delete(id);reviewChanged();});
  $('#collectionPrev').onclick=()=>{offset=Math.max(0,offset-30);void loadHistory();};$('#collectionNext').onclick=()=>{offset+=30;void loadHistory();};
  $('#collectionCaptureClose').onclick=()=>$('#collectionCaptureDialog').close();
  document.addEventListener('click',async event=>{
    const tab=event.target.closest('[data-tab="coleccion"]');if(tab)void loadHistory();
    const button=event.target.closest('[data-collection-reactivate],[data-collection-resume],[data-collection-skip],[data-collection-capture],[data-receipt-skip]');if(!button)return;
    try{
      if(button.hasAttribute('data-collection-reactivate')){await api('/api/collection/reactivate',{id:button.dataset.collectionReactivate});await loadHistory();}
      if(button.hasAttribute('data-collection-skip'))openSkip(history.checkpoints[Number(button.dataset.collectionSkip)].source);
      if(button.hasAttribute('data-receipt-skip')){const c=history.captures[Number(button.dataset.receiptSkip)];openSkip(c.source,c.groups[0]?.league&&c.groups[0].league!=='Sin verificar'?'league':'url',c.groups[0]?.league&&c.groups[0].league!=='Sin verificar'?c.groups[0].league:c.url);}
      if(button.hasAttribute('data-collection-resume')){const c=history.checkpoints[Number(button.dataset.collectionResume)];await api('/api/collection/resume',{id:c.id});status('Reanudación iniciada. Puedes detenerla desde esta pestaña.');await loadHistory();}
      if(button.hasAttribute('data-collection-capture')){
        const c=await api('/api/collection/capture/'+encodeURIComponent(button.dataset.collectionCapture));const evidenceRow=Number(button.dataset.evidenceRow), firstRow=Number.isSafeInteger(evidenceRow)&&evidenceRow>=0?evidenceRow:0;$('#collectionCaptureTitle').textContent=`${c.source.type} · ${c.records} registros`;
        $('#collectionCaptureBody').innerHTML=`<p>${esc(c.url)} · ${esc(stamp(c.capturedAt))} · ${esc(ingestionNames[c.ingestion])}</p>${c.rawContent?`<details open><summary>Archivo RAW original sin clasificar</summary><pre class="copied-page-text">${esc(c.rawContent)}</pre></details>`:''}${c.copiedText?`<details open><summary>Texto copiado de la página</summary><pre class="copied-page-text">${esc(c.copiedText)}</pre></details>`:''}${c.images.map(img=>`<figure><img class="collection-image" src="/api/collection/capture/${encodeURIComponent(c.id)}/image/${encodeURIComponent(img)}" alt="Evidencia guardada de la fuente"><figcaption>${esc(img)}</figcaption></figure>`).join('')||'<p>Adquisición estructurada sin screenshot. Los datos se guardaron como evidencia.</p>'}<div class="table-scroll"><table><thead><tr><th>EVENTO</th><th>MERCADO</th><th>CASA</th><th>SELECCIÓN</th><th>CUOTA</th><th>CLASIFICACIÓN</th></tr></thead><tbody>${c.rows.slice(firstRow,firstRow+500).map((r,index)=>`<tr><td style="max-width:260px;white-space:normal;overflow-wrap:anywhere">${esc(r.eventName)}</td><td>${esc(r.market)}</td><td>${esc(r.bookmaker||r.qualifiers?.displayedBook||"Sin identificar")}</td><td>${esc(r.selection)}</td><td>${esc(r.rawOdds??r.decimalOdds)}</td><td>${esc(c.assessments?.[firstRow+index]?.reason||r.qualifiers?.crossValidation||"Sin confirmar")}</td></tr>`).join('')||'<tr><td colspan="5">Pendiente de interpretación. No hay registros clasificados; la imagen o el texto pueden contener información.</td></tr>'}</tbody></table></div><p>Registro inicial: ${firstRow+1} · Archivo original: ${esc(c.id)}.json · Fecha de captura: ${esc(c.capturedAt ? stamp(c.capturedAt) : 'Desconocida')}</p>${c.rows.length>500?'<p>Vista de hasta 500 registros desde la selección abierta.</p>':''}`;$('#collectionCaptureDialog').showModal();
      }
    }catch(error){status(error.message);$('#collectionTotals').hidden=false;$('#collectionTotals').textContent=error.message;}
  });
  document.addEventListener('collector-section-changed',event=>{if(event.detail.tab==='coleccion'&&['evidencias','progreso'].includes(event.detail.view))void loadHistory();});
  setInterval(()=>{if($('#panel-coleccion').classList.contains('active'))void loadHistory();},10000);
  setInterval(()=>{try{const source=target(),key=source?JSON.stringify(source):'';if(key!==sourceKey)void loadProfile();}catch{}},1000);
  setTimeout(()=>void loadProfile(),500);
})();
