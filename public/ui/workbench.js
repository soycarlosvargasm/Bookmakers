(() => {
  const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let offset=0,total=0,applied=null,selected=new Set(),requestVersion=0,pendingOffset=0,appliedReview=null,organizeController=null,reconcileFrom=null;
  const stamp=d=>d?new Date(d).toLocaleString('es-ES',{timeZone:'Asia/Bangkok',year:'numeric',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Fecha desconocida';
  const catalogDimensions=['territory','sportId','competitionId','participantId','eventId','organizationId','cardId','sourceRegion'];
  const filters=()=>{const f={};for(const [key,value] of new FormData($('#workbenchFilters'))){if(catalogDimensions.includes(key))(f[key]??=[]).push(value);else f[key]=value;}return {...f,includePast:$('#workbenchFilters [name=includePast]').checked,freshOnly:$('#workbenchFilters [name=freshOnly]').checked};};
  const enterView=name=>{
    if(name==='ordenar'&&!applied)void organize();
    if(name==='final')void api('/api/workbench/final').then(renderFinal).catch(error=>$('#finalStatus').textContent=error.message);
  };
  const switchTo=name=>{
    if(window.collectorNavigation){window.collectorNavigation.go('coleccion',name);return;}
    document.querySelector('[data-tab="coleccion"]').click();
    document.querySelectorAll('[data-workbench-view]').forEach(view=>view.hidden=view.dataset.workbenchView!==name);enterView(name);
  };
  document.addEventListener('collector-section-changed',event=>{if(event.detail.tab==='coleccion')enterView(event.detail.view);});
  async function api(path,body,signal){const response=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),...(signal?{signal}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo completar el paso.');return data;}
  function cardMarkup(c,final=false){
    const stale=c.options.some(o=>Date.now()-Date.parse(o.capturedAt)>900000);
    return `<article class="match-card"><div class="match-card-head"><span>${esc(c.sport)} · ${esc(c.league)}</span>${final?'':`<label class="workbench-check"><input data-match-id="${esc(c.id)}" type="checkbox" ${selected.has(c.id)?'checked':''}> Usar este partido</label>`}</div><h3>${esc(c.event)}</h3><div class="match-prices">${c.options.map(o=>`<span><b>${esc(o.label)}</b> <strong>${esc(o.price)}</strong></span>`).join('')}</div><p>${esc(c.market)}${c.period?` · ${esc(c.period)}`:''} · ${esc(c.bookmaker)} · ${esc(stamp(c.start))}</p><p class="match-freshness">${stale?'Actualizar cuotas antes del siguiente paso':'Cuotas recientes'} · Leídas ${esc(stamp(c.updatedAt))}</p>${c.needs.length?`<p class="match-pending">${esc(c.needs.join(' · '))}</p>`:''}</article>`;
  }
  const evidenceButton=e=>`<button type="button" class="small-button" data-collection-capture="${esc(e.id)}" ${e.row!==undefined?`data-evidence-row="${e.row}"`:""}>${e.images.length?'Ver captura':'Ver texto / datos'} · ${esc(stamp(e.capturedAt))}</button>`;
  const entityMarkup=(e,logos)=>{const logo=logos?.[e.id];return `<span class="catalog-entity"><span class="catalog-logo" title="${esc(logo?.reason||'Sin logotipo')}">${logo?.status==='available'?`<img src="${esc(logo.url)}" alt="Logotipo de ${esc(e.displayName)}" width="40" height="40" loading="lazy" data-sports-logo><span hidden>○</span>`:'○'}</span><span><b>${esc(e.displayName)}</b><small>${esc(e.kind==='athlete'?'Participante':e.kind==='national_team'?'Selección nacional':e.kind==='team'?'Equipo':e.kind==='card'?'Cartelera':e.kind==='organization'?'Organización':'Competición')} · ${logo?.status==='available'?'Logotipo verificado':esc(logo?.reason||'Sin logotipo')}</small></span></span>`;};
  function offerMarkup(versions,c){const primary=versions.filter(o=>o.latest),shown=primary.length?primary:versions,history=primary.length?versions.filter(o=>!o.latest):[],sample=shown[0],evidence=versions.flatMap(o=>o.evidence.map(e=>({e,o})));return `<div class="catalog-offer">${shown.map(o=>`<b class="price-label">${esc(/^(draw|x|tie)$/i.test(o.label)?'Empate':o.label)}</b><strong class="price-value">${esc(o.price)}</strong><small class="odds-format">${esc(({american:'Americana',decimal:'Decimal',fractional:'Fraccional'})[o.format]||o.format||'Formato sin indicar')}</small>`).join('<br>')}${sample.temporalUncertainty?'<p class="temporal-note">Orden de las observaciones por confirmar</p>':''}<details><summary>Ver evidencia · ${evidence.length}</summary><p>Casa: ${esc(sample.bookmaker||c.bookmaker)} · Fuente: ${esc(sample.source||c.source)}${sample.sourceRegion?` · Región de acceso: ${esc(sample.sourceRegion)}`:''}</p>${history.length?`<p>Observaciones anteriores: ${history.map(o=>`${esc(o.price)} ${esc(o.format||'')}`).join(' · ')}</p>`:''}${evidence.map(({e,o})=>`<p><b>${esc(o.price)}</b> ${evidenceButton(e)} <small>Registro ${e.row+1}${e.observedAt?` · Observado: ${esc(stamp(e.observedAt))}`:''}</small></p>`).join('')}</details></div>`;}
  const periodLabel=p=>({regular_time:'Tiempo reglamentario',full_event:'Partido completo',first_half:'Primer tiempo',second_half:'Segundo tiempo',fight:'Combate'})[p]||p||'Período sin confirmar';
  function savedCardMarkup(c){const books=new Map();for(const o of c.options){const key=JSON.stringify([o.bookmaker||c.bookmaker,o.source||c.source]);let book=books.get(key);if(!book){book={name:o.bookmaker||c.bookmaker,source:o.source||c.source,offers:new Map()};books.set(key,book);}const versions=book.offers.get(o.offerId)||[];versions.push(o);book.offers.set(o.offerId,versions);}return `<section class="catalog-market"><h4>${esc(c.market)}${c.line!==null?` · Línea ${esc(c.line)}`:''} <span>· ${esc(periodLabel(c.period))}</span></h4>${[...books.values()].map(book=>`<div class="book-price-row"><div class="book-identity">${esc(book.name)}<small>${esc(book.source)}</small></div><div class="match-prices">${[...book.offers.values()].map(v=>offerMarkup(v,c)).join('')}</div></div>`).join('')}</section>`;}
  function eventMarkup(e,logos){const comp=e.card||e.competition;return `<article class="match-card catalog-event"><div class="match-card-head">${esc(e.territory.value?.displayName||'País desconocido')} · ${esc(comp?.displayName||'Liga sin confirmar')}${e.season?` · ${esc(e.season)}`:''}${e.organization?` · ${esc(e.organization.displayName)}`:''}</div><div class="fixture-heading"><h3 aria-label="${esc(e.event)}">${e.participants.length===2?`<span class="fixture-participants">${entityMarkup(e.participants[0].entity,logos)}<span class="fixture-versus">VS</span>${entityMarkup(e.participants[1].entity,logos)}</span>`:esc(e.event)}</h3><time>${esc(stamp(e.start))}</time></div>${e.missing.length||e.conflicts.length?`<details class="result-details"><summary>Datos por confirmar</summary><p>${esc([...e.missing,...e.conflicts].join(' · '))}</p></details>`:''}${e.markets.map(savedCardMarkup).join('')}</article>`;}
  function facetLabel(d){const select=$(`#workbenchFilters [name="${d}"]`),label=$(`[data-facet-label="${d}"]`);if(!select?.options||!label)return;const chosen=[...select.options].filter(o=>o.selected);label.textContent=chosen.length===0?({territory:'Todos los países',competitionId:'Todas las ligas',participantId:'Todos los equipos',sportId:'Todos los deportes'}[d]||'Todos'):chosen.length===1?chosen[0].dataset.label||chosen[0].textContent:`${chosen.length} seleccionados`;}
  function renderFacets(result){for(const d of catalogDimensions){const select=$(`#workbenchFilters [name="${d}"]`);if(select?.tagName!=='SELECT')continue;const chosen=new Set(result.appliedFilters?.[d]||applied?.[d]||[]),values=result.entityFacets?.[d]||[];select.innerHTML=values.map(v=>`<option value="${esc(v.id)}" data-label="${esc(v.label)}" data-search-aliases="${esc((v.aliases||[]).join(' '))}" ${chosen.has(v.id)?'selected':''}>${esc(v.label)}</option>`).join('');const list=$(`[data-facet-options="${d}"]`);if(list)list.innerHTML=values.map(v=>`<label class="facet-choice" data-facet-item data-search="${esc(v.label+' '+(v.aliases||[]).join(' '))}"><input type="checkbox" data-facet-choice="${d}" value="${esc(v.id)}" ${chosen.has(v.id)?'checked':''}><span>${esc(v.label)}<small>${v.count} enfrentamientos${v.status&&v.status!=='verified'?' · identidad local / por confirmar':''}</small></span></label>`).join('')||'<p>No hay opciones compatibles con estos filtros.</p>';const field=$(`[data-catalog-filter="${d}"]`);if(field&&['organizationId','cardId'].includes(d))field.hidden=!values.length;if(d==='sportId'&&field)field.hidden=values.length===1&&!chosen.size;facetLabel(d);}
    const notice=$('#catalogSelectionNotice');if(notice)notice.textContent=(result.removedFilters||[]).length?'Se retiraron selecciones incompatibles: '+result.removedFilters.map(v=>v.label).join(', '):'';
    if(result.appliedFilters)applied=result.appliedFilters;document.querySelectorAll('[data-facet-search]').forEach(filterOptions);
  }
  const normalized=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es');
  function filterOptions(input){const list=$(`[data-facet-options="${input.dataset.facetSearch}"]`);if(list?.querySelectorAll)list.querySelectorAll('[data-facet-item]').forEach(row=>row.hidden=!normalized(row.dataset.search).includes(normalized(input.value)));}
  function closeFacets(){document.querySelectorAll('[data-facet-popover]').forEach(el=>el.hidden=true);document.querySelectorAll('[data-facet-open]').forEach(el=>el.setAttribute('aria-expanded','false'));}
  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-facet-open]');if(open){const d=open.dataset.facetOpen,pop=$(`[data-facet-popover="${d}"]`),wasOpen=!pop.hidden;closeFacets();if(!wasOpen){pop.hidden=false;open.setAttribute('aria-expanded','true');pop.querySelector('input').focus();}return;}
    const done=event.target.closest('[data-facet-done]');if(done){closeFacets();void organize();return;}
    const clear=event.target.closest('[data-facet-clear]');if(clear){const d=clear.dataset.facetClear,select=$(`#workbenchFilters [name="${d}"]`);for(const o of select.options)o.selected=false;document.querySelectorAll(`[data-facet-choice="${d}"]`).forEach(c=>c.checked=false);facetLabel(d);select.dispatchEvent(new Event('change',{bubbles:true}));return;}
    if(!event.target.closest('.catalog-filter'))closeFacets();
  });
  document.addEventListener('change',event=>{const choice=event.target.closest('[data-facet-choice]');if(!choice)return;const d=choice.dataset.facetChoice,select=$(`#workbenchFilters [name="${d}"]`);for(const o of select.options)if(o.value===choice.value)o.selected=choice.checked;facetLabel(d);select.dispatchEvent(new Event('change',{bubbles:true}));});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeFacets();});
  function clearResults(){organizeController?.abort();organizeController=null;++requestVersion;applied=null;appliedReview=null;selected.clear();total=0;$('#workbenchMatches').innerHTML='';$('#workbenchPending').innerHTML='';if($('#workbenchSummary'))$('#workbenchSummary').innerHTML='';for(const id of ['workbenchPrev','workbenchNext','workbenchPendingPrev','workbenchPendingNext'])$('#'+id).disabled=true;}
  function reviewScope(){const review=window.captureReview?.()||{};$('#workbenchEvidenceScope').textContent=`${review.source?review.source.type+' · '+review.source.url:'Todas las fuentes'} · ${review.captureIds?.length?review.captureIds.length+' archivos seleccionados en la galería':'Todos los archivos guardados de esta fuente'}`;return review;}
  async function organize(reset=true,scrollToResults=false){
    if(reset){clearResults();offset=0;pendingOffset=0;applied=filters();appliedReview=reviewScope();$('#workbenchAllMatches').checked=true;}
    const version=++requestVersion,status=$('#workbenchStatus');$('#workbenchMatches').innerHTML='';$('#workbenchPending').innerHTML='';status.textContent='Organizando evidencias locales guardadas…';
    for(const id of ['workbenchPrev','workbenchNext','workbenchPendingPrev','workbenchPendingNext'])$('#'+id).disabled=true;
    organizeController?.abort();organizeController=typeof AbortController==='function'?new AbortController():null;
    try{const result=await api('/api/workbench/organize',{filters:applied||filters(),...(appliedReview||reviewScope()),offset,pendingOffset,...(reconcileFrom?{reconcileFrom}:{})},organizeController?.signal);if(version!==requestVersion)return;reconcileFrom=null;total=result.eventTotal??result.total;renderFacets(result);
      for(const name of ['sport','league','search','marketName','bookmaker','source','from','captureFrom']) {const list=$('#saved-'+name);if(list)list.innerHTML=(result.facets?.[name]||[]).map(v=>`<option value="${esc(v)}"></option>`).join('');}
      $('#workbenchMatches').innerHTML=(result.events?result.events.map(e=>eventMarkup(e,result.logos)):result.cards.map(savedCardMarkup)).join('')||'<p class="empty-state">No hay partidos o ámbitos clasificados con estos filtros. Revisa también los archivos pendientes.</p>';
      $('#workbenchPending').innerHTML=result.pending.map(p=>`<article class="match-card"><b>${esc(p.source)}</b><p>${esc(p.reason)}${p.rows?.length>1?` · ${p.rows.length} registros en este grupo`:""}</p><p>${esc(p.evidence.file)}</p>${evidenceButton(p.evidence)}</article>`).join('')||'<p>No hay archivos pendientes en esta selección.</p>';
      const n=result.counts;status.textContent=n?`${n.events} enfrentamientos · ${n.markets} mercados · ${n.offers} ofertas por casa.`:`${result.total} mercados organizados · ${result.captureTotal} archivos · ${result.pendingTotal} grupos pendientes.`;
      const summary=$('#workbenchSummary');if(summary&&n)summary.innerHTML=[[n.events,'Enfrentamientos'],[n.markets,'Mercados'],[n.offers,'Ofertas por casa']].map(([value,label])=>`<div class="result-metric"><strong>${value}</strong><span>${label}</span></div>`).join('');
      const counts=$('#workbenchCounts');if(counts&&n)counts.textContent=`${n.selections} selecciones · ${n.observations} observaciones · ${n.evidenceFiles} archivos de evidencia · ${n.pendingGroups} grupos pendientes (${n.filterPending} de filtro, ${n.interpretationPending} de interpretación). ${result.overlapTotal?`${result.overlapTotal} archivos contienen datos válidos y pendientes; los recuentos se solapan.`:''} ${result.warnings?.join(' ')||''}`;
      const count=$('#workbenchPendingCount');if(count)count.textContent=`${result.pendingTotal} ${result.pendingTotal===1?'grupo':'grupos'}`;
      if(scrollToResults)summary?.scrollIntoView?.({block:'start',behavior:'smooth'});
      document.querySelectorAll('[data-sports-logo]').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.nextElementSibling.hidden=false;img.closest('.catalog-entity').querySelector('small').textContent='Sin logotipo · archivo no disponible';},{once:true}));
      $('#workbenchPrev').disabled=offset===0;$('#workbenchNext').disabled=offset+50>=total;$('#workbenchPendingPrev').disabled=pendingOffset===0;$('#workbenchPendingNext').disabled=pendingOffset+30>=result.pendingTotal;
    }catch(error){if(version!==requestVersion)return;clearResults();status.textContent=error.message;}
  }
  $('#workbenchFilters').onsubmit=event=>{event.preventDefault();void organize(true,true);};
  $('#clearWorkbenchFilters').onclick=()=>{reconcileFrom=null;$('#workbenchFilters').reset();$('#workbenchHistorySource').value=$('#collectionHistorySource').value;void organize();};
  $('#workbenchPrev').onclick=()=>{offset=Math.max(0,offset-50);void organize(false);};
  $('#workbenchNext').onclick=()=>{offset+=50;void organize(false);};
  $('#workbenchPendingPrev').onclick=()=>{pendingOffset=Math.max(0,pendingOffset-30);void organize(false);};
  $('#workbenchPendingNext').onclick=()=>{pendingOffset+=30;void organize(false);};
  const changed=event=>{if(event?.target?.dataset?.facetSearch){filterOptions(event.target);return;}if(event?.target?.name&&catalogDimensions.includes(event.target.name)){const d=event.target.name,descendants={territory:['competitionId','cardId','participantId','eventId'],sportId:['competitionId','organizationId','cardId','participantId','eventId'],competitionId:['participantId','eventId'],organizationId:['cardId','participantId','eventId'],cardId:['participantId','eventId'],participantId:['eventId']};if(descendants[d]&&(!reconcileFrom||!descendants[reconcileFrom]?.includes(d)))reconcileFrom=d;}clearResults();reviewScope();$('#workbenchStatus').textContent='Selección modificada. Pulsa Ver enfrentamientos para aplicar los filtros.';};
  $('#workbenchFilters').addEventListener('input',changed);
  $('#workbenchFilters').addEventListener('change',changed);
  document.addEventListener('capture-review-changed',changed);
  $('#createFinal').onclick=async()=>{
    const button=$('#createFinal');button.disabled=true;
    try{if(applied&&JSON.stringify(filters())!==JSON.stringify(applied))throw Error('Aplica los filtros modificados antes de crear la apuesta final.');
      const body={filters:applied||filters()};if(!$('#workbenchAllMatches').checked)body.ids=[...selected];
      const draft=await api('/api/workbench/final',body);renderFinal(draft);switchTo('final');
    }catch(error){$('#workbenchStatus').textContent=error.message;}finally{button.disabled=false;}
  };
  function renderFinal(draft){if(!draft)return;$('#finalMatches').innerHTML=draft.cards.map(c=>cardMarkup(c,true)).join('');$('#finalStatus').textContent=`Fichas guardadas · ${stamp(draft.createdAt)}${draft.pending.length?' · Hay partidos pendientes de completar en Ordenar y filtrar':''}.`;
    if(draft.pending.length)$('#finalMatches').insertAdjacentHTML('beforeend',`<details class="workflow-secondary"><summary>Partidos pendientes</summary>${draft.pending.map(c=>cardMarkup(c,true)).join('')}</details>`);
  }
  $('#backToFilters').onclick=()=>switchTo('ordenar');
  $('#organizeNext').onclick=()=>switchTo('ordenar');
  let extractionStarting=false,stopPending=false,manualRunId=null,busyVersion=0,extractionVersion=0,readingVersion=0,manualReadPending=false;
  const manualMode=()=>$('#collectionScrollMode').value==='manual';
  let manualNotesVersion=null,manualNotesBusy=false,manualNotes=null;
  function ensureManualNotebook(){
    let notebook=$('#manualTextNotebook');if(notebook)return notebook;
    notebook=document.createElement('section');notebook.id='manualTextNotebook';
    notebook.innerHTML='<h3>Bloc de texto guardado</h3><p id="manualNotesStatus" role="status">Cargando los textos originales…</p><label>Texto copiado, sin modificar<textarea id="manualNotesText" readonly rows="14" style="width:100%;font-family:monospace" aria-label="Texto original guardado"></textarea></label><button type="button" class="small-button" id="manualNotesOrganize">Ordenar el texto guardado</button><div id="manualNotesClean"></div>';
    $('#workbenchManualControls').append(notebook);
    $('#manualNotesOrganize').onclick=()=>{
      const notes=manualNotes?.notes||[];
      $('#manualNotesClean').innerHTML='<h3>Texto ordenado</h3><p>Los números se conservan literalmente. La casa solo se asigna cuando su columna está demostrada en la tabla original.</p>'+notes.map(note=>`<details open><summary>${esc(note.source.type)} · ${esc(stamp(note.at))}</summary>${note.blocks.length?note.blocks.map(block=>`<h4>${esc(block.title)}${block.date?' · '+esc(block.date):''}</h4><div class="table-scroll"><table><thead><tr><th>Luchador</th><th>Números copiados de la fila</th><th>Props</th></tr></thead><tbody>${block.rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${esc(row.rawPrices)}</td><td>${esc(row.props??'Sin separar')}</td></tr>`).join('')}</tbody></table></div>`).join(''):`<pre class="copied-page-text">${esc(note.text)}</pre>`}<button type="button" class="small-button" data-collection-capture="${esc(note.id)}">Ver el original</button></details>`).join('');
    };
    return notebook;
  }
  async function refreshManualNotes(){
    if(manualNotesBusy)return;manualNotesBusy=true;ensureManualNotebook();
    try{
      manualNotes=await api('/api/workbench/manual/notes');
      $('#manualNotesText').value=manualNotes.notes.map(note=>`=== ${note.source.type} · ${stamp(note.at)} ===\n${note.text}`).join('\n\n');
      $('#manualNotesStatus').textContent=`${manualNotes.notes.length} vistas de texto guardadas · ${manualNotes.textChars} caracteres · ${manualNotes.records} cuotas estructuradas. Las vistas NO son el número de combates ni de cuotas.`;
      $('#manualNotesOrganize').disabled=!manualNotes.notes.length;
    }catch(error){$('#manualNotesStatus').textContent='No se pudo leer el texto guardado: '+error.message;}
    finally{manualNotesBusy=false;}
  }
  function scrollModeUI(){
    const manual=manualMode();$('#workbenchManualControls').hidden=!manual;$('#collectionReadMode').disabled=manual;
    if(manual){ensureManualNotebook();if(!manualNotes)void refreshManualNotes();}
    $('#workbenchManualRead').textContent='Copiar y guardar esta vista';
    const manualHelp=$('#workbenchManualControls p');
    if(manualHelp)manualHelp.textContent='La barra flotante captura mientras tú haces scroll. Puedes pausar, marcar una zona, guardar o terminar. Debajo verás el texto guardado, las cuotas extraídas y lo pendiente. Leer esta vista permite guardar una vista concreta también desde aquí.';
    if(manual)$('#collectionReadMode').value='text';
    $('#extractAll').textContent=manual?'Abrir página manual':$('#ocrMode').value==='country'?'Iniciar lectura del país':'Iniciar scroll automático';
    const title=$('#scrollModeTitle');if(title)title.textContent=manual?'Tú controlas el scroll':'El programa hace el scroll';
    $('#collectionReadHelp').textContent=manual?'Tú haces scroll en Chrome Renzo. La barra junto al cursor captura automáticamente: pausar, seleccionar zona, guardar o terminar. Arrastra los contadores para fijarla; doble clic para volver a seguir el cursor.':$('#collectionReadMode').value==='text'?'El programa hace scroll y guarda texto automáticamente. Sin screenshots, OCR ni visión.':'Primero datos y texto; capturas como respaldo.';
  }
  window.collectorScrollModeUI=scrollModeUI;
  const manualCaptureReports=new Map(),manualReportErrors=new Map(),manualReportRequests=new Set();
  async function recoverManualCaptureReport(run){
    manualReportRequests.add(run.runId);
    try{
      const history=await api('/api/collection/state?'+new URLSearchParams({type:run.source.type,url:run.source.url}));
      const start=Date.parse(run.startedAt),end=run.finishedAt?Date.parse(run.finishedAt):Infinity;
      const receipt=history.captures.find(c=>Date.parse(c.capturedAt)>=start&&Date.parse(c.capturedAt)<=end);
      if(!receipt)throw Error('No se encontró la última vista de esta sesión en el historial.');
      const capture=await api('/api/collection/capture/'+encodeURIComponent(receipt.id));
      const text=capture.copiedText||'';
      manualCaptureReports.set(run.runId,{id:receipt.id,textChars:text.length,records:capture.records,textPreview:text.slice(0,1600)});
    }catch(error){manualReportErrors.set(run.runId,error.message);}
  }
  try{const mode=localStorage.getItem('collector_scroll_mode');if(mode==='auto'||mode==='manual')$('#collectionScrollMode').value=mode;}catch{}
  $('#collectionScrollMode').onchange=()=>{try{localStorage.setItem('collector_scroll_mode',$('#collectionScrollMode').value);}catch{}scrollModeUI();};
  $('#collectionReadMode').addEventListener('change',scrollModeUI);scrollModeUI();
  $('#ocrMode').addEventListener('change',scrollModeUI);
  function stoppingUI(){
    if(!stopPending){++extractionVersion;++readingVersion;++busyVersion;}
    stopPending=true;$('#workbenchStop').disabled=true;$('#workbenchStop').textContent='Deteniendo…';$('#workbenchManualRead').disabled=true;
    $('#workbenchRunning').textContent='Deteniendo el recorrido y cancelando las fuentes en cola…';
  }
  document.addEventListener('collector-stop-requested',stoppingUI);
  document.addEventListener('collector-stop-finished',event=>{
    stopPending=false;
    if(event.detail?.confirmed)$('#workbenchExtractStatus').textContent='Captura y cola detenidas. El contenido guardado se conserva.';
    void busyState();
  });
  $('#workbenchStop').onclick=async()=>{
    if(stopPending)return;
    stoppingUI();
    try{
      if(window.stopCollector){const result=await window.stopCollector();if(result.confirmed)$('#workbenchExtractStatus').textContent='Captura y cola detenidas. El contenido guardado se conserva.';return;}
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let result;
      try{const response=await fetch('/api/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:controller.signal});result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo detener.');}finally{clearTimeout(timer);}
      $('#workbenchExtractStatus').textContent=`Cancelación enviada · ${result.stopped} ejecuciones. El texto ya guardado se conserva.`;
    }catch(error){$('#workbenchExtractStatus').textContent=`No se pudo confirmar la detención: ${error.message}. Puedes volver a pulsar Detener.`;}
    finally{stopPending=false;await busyState();}
  };
  window.startWorkbenchExtraction = async()=>{
    if(extractionStarting||stopPending)return;
    const version=++extractionVersion;extractionStarting=true;$('#extractAll').disabled=true;$('#workbenchStop').disabled=false;
    const manual=manualMode();$('#workbenchExtractStatus').textContent=manual?'Abriendo la página para que tú controles el scroll…':'Preparando la selección…';
    try{const textOnly=$('#collectionReadMode').value==='text',mode=$('#ocrMode').value;
      if(manual&&mode==='country')throw Error('Para scroll manual, elige una página / fuente o una URL específica en «Qué revisar».');
      const source=mode==='country'?null:window.collectorControls?.target?.();
      if(mode!=='country'&&!source?.url)throw Error('Elige una página guardada o pega la URL que quieres abrir.');
      if(mode==='country'&&!$('#ocrCountry').value)throw Error('Selecciona el país que quieres revisar.');
      let path,body;
      if(manual){path='/api/workbench/extract';body={textOnly:true,scrollMode:'manual',url:source.url};}
      else{
        path=mode==='country'?'/api/ocr/explore-country':mode==='url'?'/api/ocr/explore-url':'/api/ocr/explore';
        body=mode==='country'?{country:$('#ocrCountry').value}:mode==='url'?{url:source.url}:source;
        const selection=window.collectorControls?.forRun?.();if(selection)body.collection={...selection,...(mode==='url'?{scope:'url'}:{}),textOnly,...(textOnly?{maxVisionCalls:0}:{})};
      }
      const result=await api(path,body);if(version!==extractionVersion)return;
      if(manual){manualRunId=result.runId;$('#workbenchExtractStatus').textContent='Abriendo la fuente en Chrome Renzo con la barra flotante de Scroll Manual.';}
      else $('#workbenchExtractStatus').textContent=textOnly?'Scroll y copia de texto automáticos iniciados.':'Extracción automática iniciada.';
    }catch(error){if(version===extractionVersion)$('#workbenchExtractStatus').textContent=error.message;}
    finally{extractionStarting=false;await busyState();}
  };
  $('#extractAll').onclick=()=>void window.startWorkbenchExtraction();
  $('#workbenchManualRead').onclick=async()=>{
    if(manualReadPending)return;manualReadPending=true;const version=++readingVersion;$('#workbenchManualRead').disabled=true;
    try{const result=await api('/api/workbench/manual/read',{runId:manualRunId});if(version!==readingVersion)return;
      $('#workbenchExtractStatus').textContent=!result.saved?(result.reason||'Esta vista ya está guardada. Haz scroll para leer otra parte.')
        :result.records?`Vista ${result.savedViews}: texto guardado (${result.textChars} caracteres) y ${result.records} cuotas extraídas · ${result.totalRecords} en total. Archivo en PostgreSQL en curso.`
        :`Vista ${result.savedViews}: texto guardado (${result.textChars} caracteres), 0 cuotas extraídas. ${result.reason||'Pendiente de interpretación.'}`;
    }catch(error){if(version===readingVersion)$('#workbenchExtractStatus').textContent=error.message;}
    finally{manualReadPending=false;await busyState();}
  };
  $('#workbenchManualFinish').onclick=async()=>{
    if(!manualRunId||stopPending)return;$('#workbenchManualFinish').disabled=true;$('#workbenchManualRead').disabled=true;
    try{const result=await api('/api/workbench/manual/finish',{runId:manualRunId});$('#workbenchExtractStatus').textContent=`Cerrando la sesión manual · ${result.savedViews} vistas · ${result.records} cuotas guardadas. Se cierra solo tu pestaña del colector.`;}
    catch(error){$('#workbenchExtractStatus').textContent=error.message;}
    finally{await busyState();}
  };
  async function busyState(){const version=++busyVersion;try{const [state,runs]=await Promise.all([api('/api/status'),api('/api/ocr/status')]);if(version!==busyVersion)return;
    const active=runs.find(r=>!r.finishedAt&&r.manualReading),finished=runs.find(r=>r.runId===manualRunId&&r.finishedAt)||(!active?runs.find(r=>r.manualReading&&r.finishedAt):null);manualRunId=active?.runId||finished?.runId||manualRunId;
    if(finished?.state==='FAILED')$('#workbenchExtractStatus').textContent=finished.reason||'No se pudo abrir la página manual. Puedes reintentar.';
    else if(finished?.manualReading){const m=finished.manualReading;$('#workbenchExtractStatus').textContent=`Sesión manual terminada: ${m.savedViews} vistas con texto · ${m.records} cuotas extraídas · ${m.archivedViews} vistas archivadas en PostgreSQL.${finished.reason?` ${finished.reason}`:''}`;}
    const manualRun=active||finished,manualReport=manualRun?.manualReading;
    const notesVersion=manualRun?`${manualRun.runId}:${manualReport?.savedViews}`:'saved';
    if(manualMode()&&manualNotesVersion!==notesVersion){manualNotesVersion=notesVersion;void refreshManualNotes();}
    if(manualReport){
      let summary=$('#workbenchManualSummary');
      if(!summary){summary=document.createElement('div');summary.id='workbenchManualSummary';summary.setAttribute('aria-live','polite');$('#workbenchManualControls').append(summary);}
      const last=manualReport.lastCapture||manualCaptureReports.get(manualRun.runId);
      if(!last&&manualReport.savedViews&&!manualReportRequests.has(manualRun.runId))void recoverManualCaptureReport(manualRun);
      const markup=`<p><strong>Guardado realmente:</strong> ${manualReport.savedViews} vistas de texto · ${manualReport.records} cuotas extraídas · ${manualReport.pendingViews} vistas pendientes de interpretación · ${manualReport.archivedViews} vistas archivadas en PostgreSQL.</p>${last?`<p>Última vista: ${last.textChars} caracteres guardados · ${last.records} cuotas extraídas. ${last.reason?esc(last.reason):''}</p><button type="button" class="small-button" data-collection-capture="${esc(last.id)}">Ver todo lo guardado en esta vista</button><details><summary>Texto guardado · vista previa</summary><pre class="copied-page-text">${esc(last.textPreview)}</pre></details>`:manualReport.savedViews?'<p>Los textos originales siguen disponibles en el historial de capturas. Texto guardado no significa cuotas ya interpretadas.</p>':''}${manualReportErrors.has(manualRun.runId)?`<p>${esc(manualReportErrors.get(manualRun.runId))}</p>`:''}`;
      if(summary.innerHTML!==markup)summary.innerHTML=markup;
    }
    const page=$('#workbenchManualPage');if(page)page.textContent=active?.manualReading?.url?`Página activa en ${active.manualReading.browser==='renzo'?'Chrome Renzo':'navegador de prueba'}: ${active.manualReading.url}`:active?.manualReading?.opened?'Pestaña abierta en Chrome Renzo; cargando la fuente…':'';
    const locked=extractionStarting||stopPending||Boolean(state.busy||state.running||state.starting||state.stopping);
    for(const id of ['collectionScrollMode','ocrMode','ocrSource','ocrCountry','ocrUrl'])$('#'+id).disabled=locked;
    $('#extractAll').disabled=extractionStarting||stopPending||Boolean(state.busy||state.running||state.starting||state.stopping);
    $('#workbenchStop').disabled=stopPending||!(extractionStarting||state.busy||state.running||state.starting||state.stopping);
    $('#workbenchStop').textContent=stopPending||state.stopping?'Deteniendo…':'■ Detener captura';
    $('#workbenchManualRead').disabled=manualReadPending||stopPending||!active?.manualReading?.ready;
    $('#workbenchManualFinish').disabled=stopPending||!active?.manualReading?.ready;
    const activeSource=$('#captureActiveSource'),current=runs.find(r=>!r.finishedAt&&r.state!=='QUEUED')||runs.find(r=>!r.finishedAt);if(activeSource)activeSource.textContent=current?.source?`Fuente en curso: ${current.source.type} · ${current.source.url}`:'';
    if(!stopPending)$('#workbenchRunning').textContent=state.stopping?'Deteniendo…':active?active.manualReading.ready?`Scroll manual ${active.manualReading.captureActive?'capturando':'pausado'} en Chrome Renzo · ${active.manualReading.savedViews} vistas · ${active.manualReading.newRecords??active.manualReading.records} cuotas nuevas · ${active.manualReading.archivedViews} archivadas en PostgreSQL.${active.manualReading.selection?' Solo la zona seleccionada.':''}${active.manualReading.error?` ${active.manualReading.error}`:''}`:active.manualReading.opened?'Pestaña abierta en Chrome Renzo; esperando a que cargue la fuente…':'Conectando con tu Chrome Renzo…':state.busy?'Recorrido automático en curso. Puedes detenerlo aquí.':'Sin recorrido activo.';
  }catch{}}
  document.querySelectorAll('[data-workbench-step]').forEach(button=>button.onclick=()=>switchTo(button.dataset.workbenchStep));
  setInterval(()=>void busyState(),2000);void busyState();
})();
