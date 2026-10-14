# Modo manual en Chrome Renzo, Detener y registros del día

**Vigente desde 2026-10-12.** Esta nota describe el comportamiento reparado de la app
nativa `dist/ui-macos/Sportsbook Collector.app` (servidor en `127.0.0.1:3001`).

## Una aplicación, una raíz de datos

- La app principal arranca `src/ui/main.ts --server-only --port 3001` desde el proyecto y
  usa **siempre** `.engine/` del proyecto como raíz de datos. No crea directorios temporales.
- `scripts/verify-workbench-native.ts` sigue existiendo solo para revisiones; su ventana
  «Sportsbook Collector Review» trabaja en un `mkdtemp` y **no** es la app del usuario.
- Las capturas reales que quedaron en `$TMPDIR/workbench-native-*` se recuperan con
  `node scripts/recover-workbench-captures.mjs` (informe) y `--apply` (copia). El script
  copia RAW + `.txt` + imágenes + recibos + runs/checkpoints de fuentes reales, deduplica por
  SHA256 contra `.engine/raw`, excluye fixtures (`verificationFixture`, `liveSportsbook:false`,
  transportes `local-fixture`/`fixture-only`) y hosts locales, y respalda en
  `.engine/backups/recovery-<fecha>/` cualquier archivo que fuera a sustituir. El directorio
  temporal nunca se borra. El informe queda en `.audit/recovery-*.json`.
- La ingestión automática (`SnapshotIngestion`) archiva cada RAW íntegro en
  `collector_captures` y, cuando los registros tienen identificador de evento del proveedor,
  los normaliza en eventos/mercados/selecciones/cuotas. Los registros validados **sin** ese
  identificador (p. ej. extracción DOM genérica) se anuncian como «Archivo» y siguen
  disponibles en la exportación diaria; no se presentan como carga normalizada.
- Si PostgreSQL no responde, el RAW en disco es la cola; los reintentos son idempotentes por
  SHA256. El pie de la barra lateral (`#storageStatus`) muestra el estado de sincronización.

## Scroll manual conectado a Chrome Renzo

`ManualReading` abre la fuente en una **pestaña propia dentro del Chrome Renzo existente**
(`RenzoChromePage.open`, Apple Events). Nunca lanza otro navegador como sustituto: si Renzo
no está disponible, el run falla con la causa real (perfil no encontrado, JavaScript desde
Apple Events desactivado, etc.).

- El programa no hace scroll, no cambia de pestaña ni inicia recorridos. Solo observa la URL
  activa cada 2 s para mostrarla en la interfaz.
- «Leer y extraer esta vista» guarda el texto visible del viewport y extrae **únicamente**
  cuotas cuyo evento, mercado y opción comparten una tarjeta renderizada visible
  (`captureVisibleDom` con `viewportOnly` + `extractRenderedDom`). Si no se demuestra ninguna
  asociación, la vista se guarda como pendiente con un motivo concreto (`pendingReason`).
- Destinos admitidos: el host de la página elegida y los hosts de las demás regiones de la
  misma marca del catálogo (subdominios incluidos). Otra web se rechaza indicando los destinos.
- Estados que se distinguen en la interfaz y en `RunInfo.manualReading`: pestaña abierta,
  página lista + URL activa, vistas con texto, cuotas extraídas, vistas archivadas en
  PostgreSQL (según el recibo de ingestión). El run termina en `SUCCEEDED` solo si extrajo
  cuotas; con texto y 0 cuotas termina en `SKIPPED` «pendiente de interpretación».
- Detener cierra solo la pestaña del colector, nunca el resto de Chrome Renzo.

## Detener en cualquier fase

Todos los botones (cabecera, aviso de verificación, captura) llaman a `window.stopCollector`,
que envía `/api/stop`, cancela apertura, HTTP, lectura manual, recorrido, verificación
pendiente, programación y cola, invalida inicios tardíos mediante `stopVersion` y mantiene
«Deteniendo…» hasta que `/api/status` confirme inactividad. Las escrituras ya iniciadas se
conservan.

## Registros del día y exportación

- «Registros hoy» cuenta **cuotas validadas** (`assessRecord` VALID/PARTIAL) de capturas cuya
  **fecha de captura** cae en el día actual de **Asia/Bangkok**. La fuente es durable: RAW en
  `.engine/raw` ∪ archivo `collector_captures`, deduplicado por SHA256; fixtures excluidos.
  Una cuota repetida en dos capturas conserva ambas versiones. Al reabrir, el contador se
  reconstruye desde esos datos.
- Botón **«Extraer registros de hoy»** (junto al contador): consulta paginada con selector de
  fecha, recuentos de validadas / pendientes / capturas y exportación **CSV + JSON** a
  `.engine/exports/<día>/` (sin sobrescribir), con «Mostrar en Finder». No visita fuentes.
- API: `GET /api/records/day?date=AAAA-MM-DD[&format=csv|pending-csv]`,
  `POST /api/records/export {date}`, `POST /api/records/reveal {path}`.
- Columnas CSV de validadas: fuente, casa, url_fuente, url_pagina, pais_competicion, deporte,
  liga, evento, participantes, inicio_evento, mercado, periodo, linea, opcion, cuota_original,
  formato_original, cuota_decimal, estado, motivo, fecha_captura, dia_captura, metodo,
  transporte, evidencia_id, fila, sha256, origen. Pendientes en archivo aparte con tipo y motivo.

## Extracción vs Datos guardados (no mezclar)

- **Extracción** (barra izquierda) = qué está haciendo la máquina. Solo lectura: no cambia el
  motor ni su lógica. `src/ui/extraction-monitor.ts` observa las pasadas (`RunInfo`), los RAW que
  cada pasada va escribiendo y los recibos de carga a PostgreSQL. Tabla con una fila por pasada
  (activas primero, luego las de hoy): FUENTE · ESTADO (extrayendo / esperando / error) · MÉTODO
  (HTTP / Network / DOM / Accessibility / Visual, «+ AI» si hubo llamadas) · URL ACTUAL · SCROLL
  (Auto / Manual / No necesario) · PROGRESO · EVENTOS · MERCADOS · CUOTAS · REGISTROS NUEVOS ·
  DUPLICADOS DESCARTADOS · ERRORES · VELOCIDAD (cuotas/min) · ÚLTIMA CAPTURA (+ dónde quedó guardada).
  Lo que no se puede medir todavía se muestra «—»; nunca se inventa.
- Debajo, **log en tiempo real** en lenguaje humano, por SSE (`extraction_log`) con relleno desde
  `GET /api/extraction/log`, p. ej. `Bet9ja → DOM → página leída → scroll automático → 43 eventos →
  286 mercados → 1,062 cuotas → guardado en disco`, luego `→ guardado en PostgreSQL → …` y al final
  `→ … nuevas → … duplicadas descartadas → pasada completada`.
- Definiciones: eventos/mercados/cuotas se cuentan sobre los registros de las capturas de la pasada;
  «nuevos» = cuotas únicas que no estaban en la captura anterior de la misma fuente; «duplicados» =
  cuotas repetidas dentro de la pasada.
- **Datos guardados** = lo que consiguió. La vista de partidos con casas, cuotas anterior/actual y
  tendencia (`/api/matches`) vive en *Datos guardados → Matches*; ya no hay pestaña «Matches» propia.
- API: `GET /api/extraction`, `GET /api/extraction/log`.

## Matches: capa de matching (reglas primero, IA solo si hay ambigüedad)

**Matches** (barra izquierda) = filtrar y comparar. Arriba: DEPORTE · PAÍS · LIGA · FECHA · PARTIDO · CASA ·
MERCADO. Abajo: un partido por tarjeta y, por mercado/línea, una fila por casa con sus cuotas originales.
No muestra nada del motor (eso está en *Actividad → Motor en vivo*).

Flujo: datos extraídos → normalización → matching → partido/mercado único → comparación.

1. **Reglas** (`src/matching/unify.ts`, determinístico y probado): deporte, país de la liga, equipos (alias de
   `participant_aliases`, abreviaturas «R. Madrid» ~ «Real Madrid», sufijos FC/CF/S.K., calificadores U19/Women/B que
   nunca se confunden), hora (≤ 15 min mismo saque; ≤ 90 min si los equipos son idénticos), local/visitante
   invertidos (se mapea por lado), partidos ya probados por el motor (`event_matches`).
   Mercado, periodo, selección y línea se unifican en `src/ui/matches.ts` (nombres revisados: Moneyline /
   Resultado Final / Cuotas del partido / 1X2 → «1X2 / Ganador»; totales y hándicap por línea).
2. **IA solo para pares ambiguos** (`src/matching/ai.ts`, `layer.ts`): usa la integración de OpenAI que ya existe
   (`visual/openai-config.ts`: misma clave, modelo e interruptor «Visión OpenAI»); no hay otra API ni otras
   credenciales. Recibe nombres, deporte, liga, país y hora, nunca cuotas; el contenido se trata como dato no fiable.
   Responde SAME / DIFFERENT / UNSURE con confianza y motivo; solo se fusiona con SAME ≥ 0,85 y dentro de la ventana
   de seguridad de las reglas. No crea, edita ni mueve ningún precio.
3. **Persistencia**: cada veredicto se guarda en `match_resolutions` (migración 022) con clave por firma del par, de
   modo que no se vuelve a preguntar tras reiniciar. Sin IA disponible los pares quedan sin agrupar y se reintentan.
4. La capa se actualiza al entrar capturas nuevas y cada 60 s; se narra en *Actividad → Motor en vivo* («Matching →
   556 eventos → 486 partidos únicos → 70 agrupados (65 por reglas, 5 por IA)»). Estado: `GET /api/matching/status`.

Límites conocidos: el país solo se muestra si la etiqueta de liga de la fuente lo trae («Spain - La Liga»);
1xBet/Melbet/Betwinner exportan mercados sin nombre (`type_N`) y no se comparan; «Momios Mejorados» (Codere) es un
mercado promocional distinto y no se mezcla con el 1X2 normal; eventos sin dos equipos identificables (futuros,
«(Bookings)») quedan fuera del comparador.
