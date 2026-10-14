# Prompt maestro de relevo — Sportsbook Collector

Copia desde la línea “INICIO DEL PROMPT” hasta “FIN DEL PROMPT” y entrégaselo al siguiente agente. Este documento fue reconstruido mediante inspección directa del workspace y del estado local el 16 de septiembre de 2026 (zona horaria Asia/Bangkok). No existe historial Git en esta carpeta, por lo que no se puede atribuir honestamente la autoría ni reconstruir cada decisión cronológica. Los hechos marcados como comprobados provienen del código, las pruebas, los metadatos o PostgreSQL; las interpretaciones y riesgos deben volver a verificarse.

---

## INICIO DEL PROMPT

Actúa como ingeniero principal, auditor técnico y responsable de investigación de datos/licencias para continuar este proyecto. No empieces reescribiéndolo. Primero inspecciona el estado real, contrasta esta transferencia con los archivos y produce un diagnóstico basado en evidencia. Después plantea e implementa sólo los cambios que el usuario autorice o que estén claramente dentro del objetivo que te dé.

### 1. Ubicación y advertencia de ruta

El workspace está en:

`/Users/User/Desktop/SPORTSBOOK COLLECTOR `

La carpeta termina con un espacio. Conserva las comillas al usarla en shell:

```sh
cd "/Users/User/Desktop/SPORTSBOOK COLLECTOR "
```

No hay `.git` en este directorio. No inventes commits, ramas, autores ni una cronología que el filesystem no pueda demostrar. Antes de modificar nada, considera inicializar Git sólo si el usuario lo autoriza; no atribuyas el código existente a ningún agente concreto.

### 2. Objetivo aparente del proyecto

Es un núcleo privado en TypeScript/Node.js para recolectar datos de mercados deportivos, guardar primero evidencia RAW, normalizar eventos/mercados/selecciones/cuotas, conservar historial append-only y servir datos mediante una API local protegida.

No contiene y no debe confundirse con:

- ejecución de apuestas, bet slips o manejo de fondos;
- predicciones o recomendaciones de apuesta;
- frontend;
- credenciales hardcodeadas;
- un derecho ya aprobado para revender o redistribuir cuotas.

La intención declarada es separar conectores, sesiones privadas, evidencia RAW, normalización, almacenamiento, salud de fuentes, polling y API. El producto comercial todavía no tiene resuelto el derecho de uso de todas las fuentes.

### 3. Estado técnico comprobado el 2026-09-16

Entorno observado:

- macOS 26.5, arm64.
- Node.js `v22.14.0`.
- npm `10.9.2`.
- paquete: `personal-sportsbook-collector-core@0.1.0`.
- TypeScript estricto, ESM/NodeNext, target ES2022.
- `.env` ausente en el workspace.
- En el shell de auditoría estaban sin definir `DATABASE_URL`, `API_KEY`, `BETONLINE_CDP_URL` y `BROWSER_CDP_URL`.
- `node_modules` existe (~69 MB) y `dist` existe (~684 KB); ambos están ignorados por Git.

Validaciones ejecutadas y resultados:

```sh
npm run typecheck   # exit 0
npm test            # exit 0: 20/20 pruebas, 0 fallos
npm run build       # exit 0
npm run migrations  # validó 3 migraciones; no aplicó porque DATABASE_URL no estaba en el shell
```

No confundas lo anterior con pruebas end-to-end actuales de proveedores: la mayoría de las pruebas son unitarias o de integración local. No se ejecutaron colecciones live durante esta auditoría.

Estado de runtime observado:

- Contenedor `sportsbookcollector-postgres-1`, imagen `postgres:17-alpine`, activo y publicado en `127.0.0.1:5432`.
- Proceso host `node dist/src/main.js`, PID observado `81620`, escuchando en `127.0.0.1:8787` y con cwd igual al workspace. El PID puede cambiar: vuelve a comprobarlo.
- `GET /health` sin API key respondió `401 {"error":"unauthorized"}`, confirmando que la protección está activa. No intentes extraer la API key del proceso ni la muestres.
- No se observó listener en `127.0.0.1:9223`; no había endpoint CDP de Edge disponible en la auditoría.
- `docker compose ps` desde el shell actual no puede interpolar el compose porque faltan `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB`, aunque el contenedor creado anteriormente sigue activo.

### 4. Estado de PostgreSQL comprobado sin leer payloads sensibles

Migraciones registradas:

- `001_core.sql`, aplicada `2026-09-13 11:17:31.437723+00`.
- `002_bovada_source_market.sql`, aplicada `2026-09-13 11:17:31.445509+00`.
- `003_betonline_raw_live_audit.sql`, aplicada `2026-09-14 14:41:08.104985+00`.

Conteos de tablas al auditar:

| Tabla | Filas |
|---|---:|
| sportsbooks | 9 |
| raw_payloads | 114 |
| events | 526 |
| event_versions | 689 |
| markets | 22,812 |
| selections | 23,066 |
| odds_observations | 23,426 |
| collector_runs | 27 |
| source_health | 21 |

RAW por fuente/tipo y último timestamp observado:

| Fuente | Tipo | Cantidad | Último `retrieved_at` UTC |
|---|---|---:|---|
| actionnetwork | scoreboard-json | 2 | 2026-09-15 12:32:46.637+00 |
| betonline | dom | 6 | 2026-09-13 11:17:53.667+00 |
| betonline | json | 4 | 2026-09-13 11:17:52.203+00 |
| bovada | fetch-error | 2 | 2026-09-15 05:14:41.578+00 |
| bovada | fetch-json | 24 | 2026-09-15 05:15:55.924+00 |
| sxbet | markets-active | 13 | 2026-09-15 12:30:54.092+00 |
| sxbet | orderbook-snapshot | 63 | 2026-09-15 12:30:54.533+00 |

Últimos estados de salud almacenados:

- Action Network: 1 `HEALTHY`, último `2026-09-15 12:32:44.181+00`.
- BetOnline: 1 `HEALTHY` (`2026-09-13 11:17:38.560+00`) y 1 `DEGRADED` (`2026-09-14 14:42:56.517+00`).
- Bovada: 4 `HEALTHY`, último `2026-09-15 05:14:34.637+00`.
- SX Bet: 14 `HEALTHY`, último `2026-09-15 12:30:56.564+00`.

Ejecuciones registradas:

- Action Network `events`: 1 `SUCCEEDED`, 180 registros.
- Action Network `live`: 1 `SUCCEEDED`, 0 registros.
- Bovada `events`: 4 `SUCCEEDED` con 28,419 registros sumados y 2 `FAILED`.
- Bovada `live`: 4 `SUCCEEDED` con 389 registros.
- SX Bet `events`: 6 `SUCCEEDED` con 60 registros y 1 fila aún `RUNNING`.
- SX Bet `live`: 7 `SUCCEEDED` con 66 registros y 1 fila aún `RUNNING`.

Las dos filas SX Bet en `RUNNING` parecen ejecuciones interrumpidas que nunca se cerraron. Confirma timestamps/causa y diseña reconciliación de runs huérfanos; no las borres sin autorización.

Datos normalizados por sportsbook lógico:

- Bovada: 467 eventos, 22,488 mercados, 22,514 selecciones, 22,866 observaciones; última observación `2026-09-15 05:15:55.944+00`.
- BetOnline: 23 eventos, 82 mercados, 310 selecciones, 310 observaciones; última observación `2026-09-13 11:17:53.669+00`.
- SX Bet: 6 eventos, 62 mercados, 62 selecciones, 70 observaciones; última observación `2026-09-15 12:30:53.014+00`.
- Action Network produjo sportsbooks lógicos por book ID: `actionnetwork-15`, `-30`, `-68`, `-69`, `-71`, `-75`; cada uno muestra 5 eventos, 30 mercados, 30 selecciones y 30 observaciones. Esto no coincide completamente con los IDs por defecto declarados en código (`3,13,21,24,68,69,75`); investiga si la API devuelve IDs distintos, si hubo configuración externa o si existe un problema de mapeo.

No inspecciones ni vuelques `raw_payloads.raw_payload`, cookies, storage state, variables de entorno o cabeceras sensibles salvo necesidad expresa y con redacción segura.

### 5. Componentes implementados

#### Configuración y ejecución

- `src/config/index.ts`: carga host, puerto, DB, API key, ruta de sesiones, CDP, polling y nivel de log.
- `src/main.ts`: levanta Fastify y conecta almacenamiento si `DATABASE_URL` existe.
- runners separados: `run-bovada.ts`, `run-sxbet.ts`, `run-actionnetwork.ts`, `run-betonline.ts`, `run-betonline-diagnostics.ts`, `run-polling.ts`.
- `Dockerfile`: Node 22 Bookworm, `npm ci`, instala Chromium de Playwright, compila y ejecuta `dist/src/main.js`.
- `docker-compose.yml`: PostgreSQL 17 y servicio collector, puertos sólo en loopback, volumen de DB y `.sessions`.

#### Contrato y aislamiento de conectores

- `SportsbookConnector` define `initialize`, login/restauración/validación, recolección events/prematch/live, health, logout y shutdown.
- `ConnectorRunner` clasifica fallos y devuelve resultado sin lanzar, pero actualmente sólo aparece usado en pruebas; el polling no lo usa directamente.
- Clasificación de fallos: auth, rate limit, 5xx, timeout, DNS, HTML/JSON inválido, WebSocket, browser crash, DB y unknown.

#### RAW-first, normalización e identidad

- El `CollectorService` registra el run, invoca el conector, guarda todos los RAW antes de guardar normalizados, termina el run y emite métricas JSON.
- Modelo normalizado nullable para sportsbook, deporte, competición, evento, participantes, estado/fase/score/clock, mercado, período, selección, estado, línea, cuota, IDs de origen, timestamps, jugador y qualifiers.
- Conversión decimal/americana/fraccional.
- Identidad SHA-256 determinista con objeto canonicalizado.
- Historial in-memory que separa `price_change` de heartbeat.
- PostgreSQL vuelve a comprobar cambios contra la última cuota antes de insertar una observación.

#### Sesiones y navegador

- `BrowserManager`: contexto reutilizable por `sportsbook:accountAlias`, restauración de Playwright storage state y sessionStorage, lanzamiento local o conexión CDP.
- `SessionManager`: estados de ciclo de vida, rutas segmentadas validadas, archivos privados con directorio `0700` y archivos `0600`.
- `SessionEngine`: login humano visible, guarda storage state/sessionStorage, restaura, valida y limpia en logout.
- `BrowserObserver`: captura XHR/fetch/SSE y frames WebSocket mediante CDP; conserva opcode, dirección, request ID, tamaño, encoding y tópico Diffusion observado cuando se puede extraer literalmente.
- Diagnóstico de red: request/response/fallo/console/pageerror con lista limitada de cabeceras y redacción.

#### PostgreSQL

- Tablas: sportsbooks, accounts, session_metadata, raw_payloads, events, event_versions, markets, selections, odds_observations, collector_runs, source_health y `_collector_migrations`.
- RAW e historia de odds son append-only por diseño.
- Las sesiones privadas viven en filesystem; la API no expone rutas de sesión.
- Migraciones se aplican transaccionalmente y se registran.

#### API

- Fastify en `127.0.0.1` por defecto.
- Todas las rutas requieren `x-api-key`; comparación con `timingSafeEqual`.
- Si no hay API key configurada responde 503; key ausente/incorrecta responde 401.
- Rutas: `/health`, `/sportsbooks`, `/sportsbooks/:id/status`, `/sports`, `/competitions`, `/events`, `/events/:id`, `/events/:id/markets`, `/events/:id/odds`, `/odds/current`, `/odds/history`, `/changes`, `/source-health`, `/v1/feed/events`, `/v1/feed/odds`, `/v1/feed/changes`.
- Paginación validada en las rutas principales; URLs de origen se sanea antes de exponer.
- Errores de DB se convierten en 503 genérico; otros errores en 500 genérico.

#### Polling

- Scheduler con intervalos configurables, guard RPM y timers independientes.
- Defaults: live 5 s, prematch-near 15 s, prematch-far 60 s, idle 300 s, error 30 s, 60 RPM.
- Polling habilita por defecto Bovada y SX Bet; Action Network es opt-in.
- Guarda salud antes de cada ciclo y omite una colección si health no es `HEALTHY`.
- Maneja SIGINT/SIGTERM y cierra conectores, browser y DB.

### 6. Conectores: comportamiento y nivel real de validación

#### Bovada

- Usa un navegador Playwright headless y hace `fetch` desde el contexto de la página a endpoints de coupon JSON.
- Deportes por defecto: football, basketball, baseball, tennis y hockey.
- Soporta events, prematch (`preMatchOnly=true`) y live (`liveOnly=true`).
- Si algunas rutas fallan conserva RAW `fetch-error`; sólo lanza si fallan todas.
- Parser conserva IDs de evento/mercado/selección, mercados dinámicos, períodos, líneas, odds RAW y timestamp del proveedor.
- Hay pruebas del parser y datos reales almacenados. No hay prueba live automatizada actual ni evidencia de licencia comercial.

#### SX Bet

- Usa REST público: mercados activos y snapshot de orderbook desde perspectiva taker.
- Por defecto consulta hasta 100 mercados y dispara los snapshots en paralelo.
- Modela la fuente como exchange en qualifiers y transforma porcentaje implícito a decimal.
- Hay datos reales y health históricos. No hay tests específicos del conector ni garantía de que endpoints/esquemas/términos sigan iguales.
- La investigación existente concluye que el acceso técnico es viable, pero el permiso comercial está pendiente por posible contradicción entre material para developers y términos generales.

#### Action Network

- Usa scoreboard público por liga; defaults: NFL, NCAAF, NBA, WNBA, MLB y NHL.
- Book IDs por defecto en código: 3, 13, 21, 24, 68, 69 y 75.
- Normaliza moneyline, spread y total por book como `actionnetwork-<book_id>`.
- Hay una colección real exitosa, pero no existen tests del parser/conector y la investigación legal actual no analiza Action Network. No lo apruebes para producción o reventa sin revisar términos, origen de los book IDs, atribución, caché, redistribución y licencia.

#### BetOnline

- Diseñado para adjuntarse exclusivamente a una sesión Microsoft Edge ya abierta mediante CDP proporcionado por el usuario.
- Rechaza un User-Agent que no contenga `Edg/`.
- En CDP no crea pestaña, no navega para recuperarse, no recarga, no hace login automático, no resuelve CAPTCHA y no cierra el navegador remoto.
- Observa pasivamente tráfico y DOM; captura tarjetas visibles y mercados/selecciones.
- Parser tolerante busca múltiples nombres de campos; conserva IDs, mercados dinámicos, odds, estado, score y reloj.
- Health diferencia challenge, bloqueo regional, upstream error, falta de tarjetas y falta de actividad Diffusion.
- Último metadato de sesión en `.sessions/betonline/personal/metadata.json`: `AUTH_REQUIRED`, actualizado `2026-09-13T01:48:03.783Z`, con un error de browser cerrado procedente de un intento de Chrome for Testing. Sólo existe `metadata.json`; no hay `state.json` ni `session-storage.json` en esa carpeta.
- PostgreSQL contiene una observación `HEALTHY` posterior y otra `DEGRADED` aún posterior. Son subsistemas distintos: metadato de SessionManager frente a health del conector CDP. No los mezcles ni declares la sesión actual válida.
- En la auditoría no había puerto 9223 escuchando. BetOnline no está operativo ahora mismo.
- README documenta que Edge 153 rechazó remote debugging con el perfil por defecto: `DevTools remote debugging requires a non-default data directory`. No reinicies Edge automáticamente, no uses `open -na`, no crees otro perfil, no copies el perfil y no borres lock files. Si el usuario quiere reactivar esta vía, necesita decidir explícitamente cómo proveer un endpoint CDP legítimo sin arriesgar su perfil/sesión.

### 7. Pruebas existentes (20, todas pasan)

Cobertura actual:

- autenticación API, paginación inválida y ausencia de rutas de sesión;
- redacción de secretos y aislamiento de archivos de sesión;
- parser BetOnline: mercado dinámico, nulos, live score/clock, suspensión y bloqueo regional;
- parser Bovada: rutas por defecto, IDs, períodos, líneas, odds y campos ausentes;
- reutilización de contexto de navegador y captura DOM RAW;
- normalización y conversión de odds;
- identidad de mercado y canonicalización de qualifiers;
- deduplicación/heartbeats e historial append-only en memoria;
- ciclo de estados de sesión y persistencia;
- guard de scheduler/RPM;
- aislamiento lógico de `ConnectorRunner`;
- auditoría de collector runs exitosos y fallidos.

No cubren todavía:

- PostgreSQL real, migración desde cero y upgrades sobre un volumen existente;
- consultas API sobre la DB real;
- concurrencia y rendimiento con decenas de miles de records;
- conectores SX Bet y Action Network;
- requests reales actuales de Bovada;
- CDP/Edge real y frames Diffusion binarios;
- Docker Compose end-to-end;
- recuperación de runs `RUNNING` abandonados;
- políticas `SourceAdmission` y bloqueo de fuentes sin licencia;
- retención/redacción profunda de RAW.

### 8. Riesgos y huecos que debes tratar como pendientes, no como funcionalidades completas

Prioridad crítica:

1. **No existe `SourceAdmission` en código.** Sólo está recomendado en `RESEARCH_FREE_REALTIME_SOURCES.md`. Hoy ninguna capa impide que una fuente `pending` o `blocked` llegue a PostgreSQL o a la API.
2. **Riesgo de captura excesiva en BetOnline.** `BrowserObserver` captura todos los XHR/fetch de la página sin allowlist de host/path y todos los frames WebSocket se etiquetan como `diffusion` sin mapear request ID a URL. El cuerpo RAW no recibe redacción estructural antes de almacenarse. Puede capturar información de cuenta, endpoints de terceros o secretos. No leas ni publiques los payloads existentes. Diseña allowlist, minimización, clasificación, redacción y política de retención antes de volver a capturar.
3. **Derechos/licencias no resueltos.** Una API o WebSocket técnicamente accesible no autoriza redistribución. No anuncies el producto como feed comercial hasta obtener evidencia contractual por fuente.
4. **Action Network carece de revisión legal específica.** Su uso actual debe tratarse como laboratorio interno.

Prioridad alta:

5. Dos `collector_runs` de SX Bet quedaron `RUNNING`; no hay reconciliación al arrancar ni heartbeat/lease del run.
6. El scheduler tiene `errorBackoffMs`, pero tras un error vuelve a programar con el intervalo normal del modo; el backoff de error no se aplica realmente.
7. El supuesto guard `maxRequestsPerMinute` limita ciclos, no requests. Un ciclo de SX Bet puede lanzar hasta 101 requests y lo hace con `Promise.all`; Action Network lanza una por liga. Hay riesgo de rate limiting y carga explosiva.
8. `run-polling.ts` inicializa conectores secuencialmente antes de arrancar timers. Un fallo de inicialización puede impedir que arranquen las otras fuentes. Además `events` y `live` son timers separados y sí pueden solaparse entre ellos para el mismo conector.
9. `POLLING_ENABLED` se carga en config pero no se usa. El API y el poller siguen siendo procesos separados.
10. Docker `CMD` no ejecuta migraciones. Los scripts montados en `/docker-entrypoint-initdb.d` sólo inicializan un volumen nuevo; upgrades posteriores requieren `npm run migrations` explícito.
11. Compose exige variables de Postgres, pero no construye `DATABASE_URL` para collector. Sin `.env` adecuado, el collector puede arrancar sin DB o el compose ni siquiera interpolar.
12. No hay test de backup/restore, retención, particionamiento ni crecimiento de RAW/odds.

Prioridad media:

13. `saveNormalizedRecords` hace numerosas consultas seriales por cada record; una corrida Bovada produjo decenas de miles de records. Diseña batching/upserts y mide antes de optimizar.
14. `event_versions` evita duplicar `eventId:collectedAt`, pero guarda como `version_payload` sólo el primer record normalizado de ese evento/timestamp, no un snapshot de evento puro. Revisa semántica.
15. `marketIdentity` incluye selección y línea. En consecuencia la tabla `markets` funciona casi como una identidad de quote/selección, mientras `selections` vuelve a separar la selección. Decide y documenta si esto es intencional.
16. Las APIs cargan todo el historial desde PostgreSQL y luego paginan en memoria; `/v1/feed/*` no pagina. No escala.
17. `source_health`, RAW e historial crecen sin límites.
18. Action Network usa `Promise.all`: un fallo de una liga hace fallar toda la colección y no deja RAW de fallo por liga.
19. SX Bet marca todos los resultados de una llamada `liveOnly` como live; debe verificarse contra el estado real del mercado y el contrato actual del endpoint.
20. Dependencia `@fastify/cors` instalada pero no registrada; decide si eliminarla o configurarla, sin ampliar acceso por defecto.
21. `.env.example` dice “authorized Chrome”, mientras README/código exigen Edge. También hay errores internos de BrowserManager que dicen Chrome. Unifica documentación y mensajes.
22. No hay validación fuerte de variables numéricas en config general; `PORT` podría ser `NaN`.
23. El proceso API lleva tiempo activo con un build previo; después de modificar código hay que reiniciarlo de forma controlada. No mates procesos sin comprobar propiedad/impacto y sin que el cambio esté autorizado.

### 9. Investigación existente que debes verificar, no copiar ciegamente

Lee completo `RESEARCH_FREE_REALTIME_SOURCES.md`. Su conclusión actual es:

- No se encontró una fuente líder simultáneamente gratuita, realtime, multi-sportsbook y claramente autorizada para reventa.
- SX Bet: técnicamente interesante; permiso comercial pendiente por contradicción aparente entre contenido para developers y términos generales.
- Polymarket: REST/WebSocket públicos, pero es prediction-market CLOB, no sportsbook; licencia de redistribución no demostrada.
- Kalshi: acceso técnico público/parcialmente autenticado, pero el Developer Agreement revisado restringía almacenamiento/agregación/compartición.
- Betfair Exchange: API/stream oficial, pero publicación de precios requiere licencia comercial apropiada.
- BetOnline/Bovada/Bet365/DraftKings: observabilidad técnica no equivale a autorización; no aprobar scraping o tráfico interno para producto comercial sin permiso.
- The Odds API: útil como agregador, pero el free tier y los derechos de reventa deben contrastarse con el producto final.

Fuentes ya anotadas en el documento, que debes volver a abrir y fechar:

- SX Bet API: `https://docs.sx.bet/api-reference/introduction`
- SX Bet Help/API: `https://help.sx.bet/en/articles/12984899-api`
- SX Bet developer blog: `https://blog.sx.bet/developers/tutorials/cluster/building-on-sx-bet/`
- SX Bet terms: `https://help.sx.bet/en/articles/3613372-terms-and-conditions`
- Polymarket market data: `https://docs.polymarket.com/market-data/overview`
- Polymarket WebSocket: `https://docs.polymarket.com/api-reference/wss/market`
- Polymarket rate limits: `https://docs.polymarket.com/api-reference/rate-limits`
- CFTC filing citado: `https://www.cftc.gov/sites/default/files/filings/orgrules/25/08/rules08122528299.pdf`
- Kalshi REST: `https://docs.kalshi.com/getting_started/quick_start_market_data`
- Kalshi WebSocket: `https://docs.kalshi.com/getting_started/quick_start_websockets`
- Kalshi Developer Agreement: `https://kalshi-public-docs.s3.amazonaws.com/Kalshi-Developer-Agreement.pdf`
- Bet365 terms: `https://help.bet365.com/s/en-gb/terms-and-conditions`
- DraftKings terms: `https://sportsbook.draftkings.com/legal/in-terms-of-use`
- Betfair licensing: `https://support.developer.betfair.com/hc/en-us/articles/360002464152-Which-API-Licence-Do-I-Require`
- Bovada terms PDF: `https://www.bovada.lv/contents/terms_of_service_bvd.pdf`
- Chrome DevTools Protocol Network: `https://chromedevtools.github.io/devtools-protocol/tot/Network/`
- RFC 6455: `https://www.rfc-editor.org/info/rfc6455/`

### 10. Plan de búsqueda para nuevas fuentes

Haz búsqueda web actualizada y usa primero fuentes primarias: documentación oficial, términos vigentes, developer agreements, pricing oficial y respuestas escritas del proveedor. Para cada candidato registra URL, título, versión/fecha, fecha de consulta, extracto breve, interpretación, incertidumbre y contacto comercial. No uses blogs SEO como prueba de licencia.

Investiga en paralelo estas categorías:

1. **Agregadores de odds con contrato comercial:** Sportradar, Genius Sports, LSports, SportsDataIO, The Odds API, SportsGameOdds, OpticOdds u otros actuales. No supongas que son gratuitos; pide sandbox/trial y cotización. Verifica display, cache, derived data, histórico, redistribución, sublicencia, territorios, latencia, SLA y límites.
2. **Exchanges oficiales:** Betfair Exchange, SX Bet y otros exchanges con API documentada. Separa bid/ask, profundidad, liquidez y reglas de resolución; no los presentes como cuota de sportsbook.
3. **Prediction markets regulados o CLOB:** Polymarket, Kalshi y alternativas vigentes. Verifica jurisdicción, autenticación, licencia de market data y posibilidad de uso por terceros.
4. **APIs de operadores directos:** sólo APIs oficiales con acuerdo de developer/comercial. No cuentes endpoints internos descubiertos en navegador como API autorizada.
5. **BYO-source / customer-owned data:** modelo en el que el cliente aporta su propia licencia/API key y el software sólo normaliza. Aun así, define responsabilidades, auditoría y bloqueo de exportación.
6. **Datos históricos/open data:** pueden servir para desarrollo y backtesting, pero no los confundas con realtime odds. Investiga datasets académicos/oficiales con licencia clara.
7. **Afiliados/partnerships:** algunos operadores ofrecen widgets o feeds mediante acuerdo de afiliación. Verifica si se permite extracción, almacenamiento y comparación multi-casa.

Para Action Network, averigua específicamente:

- si `/web/v1/scoreboard/*` es una API pública soportada o un endpoint interno;
- términos aplicables al consumo automatizado;
- origen y nombre exacto de cada `book_id`;
- derechos para mostrar, almacenar, comparar y redistribuir;
- rate limits, cambios de esquema, atribución y cache TTL;
- si existe API/partnership oficial alternativa.

Para cada fuente crea una matriz con:

```text
source_id
legal_entity
official_docs_url
terms_url
pricing_url
access_mode
source_kind
auth_method
realtime_mechanism
sports_and_markets
prematch/live
rate_limits
data_latency
historical_access
commercial_display
storage_allowed
cache_allowed
aggregation_allowed
derived_data_allowed
redistribution_allowed
sublicensing_allowed
territories
attribution
retention_limit
SLA/support
commercial_contact
approval_evidence
status = approved | pending | blocked
checked_at
reviewer_notes
```

No marques `approved` por inferencia. Requiere texto contractual inequívoco o autorización escrita para el caso de uso concreto.

### 11. Decisiones que debes obtener del usuario antes de cerrar el diseño comercial

Pregunta sólo cuando la respuesta cambie materialmente el trabajo. Deben quedar definidos:

- uso personal/interno versus producto para terceros;
- países donde operará la empresa, el servidor y los usuarios;
- mostrar cuotas, alertas/analytics, vender acceso API o revender un feed;
- necesidad real de multi-book, live, histórico y latencia objetivo;
- deportes/ligas prioritarios;
- presupuesto mensual y tolerancia a trials/pagos;
- retención necesaria;
- si aceptará exchanges/prediction markets como categoría separada;
- si existe relación contractual/afiliada con algún operador;
- si quiere reactivar BetOnline/Edge y está dispuesto a solicitar autorización escrita.

### 12. Orden recomendado de continuación

1. Preserva el estado actual y genera backup verificable de DB/configuración antes de migraciones importantes. No incluyas secretos en el backup compartido.
2. Añade tests de integración PostgreSQL y una prueba de migración desde volumen vacío y desde el esquema actual.
3. Implementa `SourceAdmission` y enforcement en scheduler, collector, storage y API: `approved` puede exponerse; `pending` sólo laboratorio interno; `blocked` no se inicia ni captura.
4. Corrige primero minimización/allowlist/redacción/retención del observer antes de cualquier nueva sesión BetOnline.
5. Implementa leases/heartbeats y reconciliación de collector runs huérfanos.
6. Cambia el rate limiting a requests reales por fuente, limita concurrencia y aplica exponential backoff con jitter y `Retry-After`.
7. Aísla inicialización y ejecución por conector para que una fuente caída no detenga las demás, evitando solapamiento peligroso por fuente.
8. Agrega pruebas contractuales/fixtures para SX Bet y Action Network; versiona schemas y detecta drift.
9. Lleva paginación/filtros a SQL y diseña retención/particiones/índices según mediciones.
10. Ejecuta investigación legal/comercial y no habilites exportación pública hasta contar con aprobación por fuente.
11. Sólo entonces evalúa frontend, alertas o API externa.

### 13. Criterios de seguridad y límites obligatorios

- No automatices login, 2FA o CAPTCHA ni intentes evadir Cloudflare, geoblocks o controles anti-bot.
- No reinicies, clones, desbloquees o borres archivos del perfil Edge del usuario.
- No extraigas cookies, passwords, API keys, tokens o variables de procesos para “hacerlo funcionar”.
- No imprimas RAW potencialmente sensible.
- No expongas `.sessions` por la API ni lo incluyas en commits/artefactos.
- Mantén binds en loopback salvo decisión explícita y añade TLS/autorización adecuada antes de exposición remota.
- No borres filas, contenedores, volúmenes ni sesiones sin autorización clara y backup.
- Respeta términos, robots, rate limits, jurisdicción y derechos de base de datos; acceso técnico no es permiso legal.

### 14. Primeras acciones exactas del nuevo agente

Ejecuta inicialmente verificaciones no destructivas:

```sh
cd "/Users/User/Desktop/SPORTSBOOK COLLECTOR "
pwd
rg --files -g '!node_modules' -g '!dist'
npm run typecheck
npm test
npm run build
npm run migrations
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:8787 -sTCP:LISTEN
lsof -nP -iTCP:9223 -sTCP:LISTEN
```

Lee completos, como mínimo:

- `README.md`
- `RESEARCH_FREE_REALTIME_SOURCES.md`
- `package.json`
- `.env.example`
- `docker-compose.yml`
- todas las migraciones;
- `src/connectors/**`;
- `src/browser/**`;
- `src/collectors/**`;
- `src/storage/postgres.ts`;
- `src/api/server.ts`;
- `src/run-polling.ts`;
- todas las pruebas.

Después entrega al usuario un informe breve con cuatro secciones: “confirmado”, “cambió desde este relevo”, “riesgos/bloqueos” y “siguiente acción recomendada”. Cita archivos/líneas y URLs primarias. Si vas a modificar, presenta primero el alcance exacto y luego verifica con tests proporcionales al riesgo.

### 15. Definición de terminado para la siguiente fase

No declares el sistema “listo para producción” hasta que, como mínimo:

- cada fuente tenga admisión y evidencia legal registrada;
- RAW esté minimizado, allowlisted, redactado y tenga retención;
- tests DB/Docker/end-to-end pasen;
- no queden runs huérfanos sin reconciliación automática;
- rate limiting y backoff reflejen requests reales;
- polling esté aislado por fuente y no haya solapamientos no deseados;
- API pagine/filtre en DB y tenga estrategia de exposición segura;
- backups/restores estén probados;
- observabilidad alerte por drift, frescura, fallos y cero registros inesperados;
- BetOnline permanezca deshabilitado salvo endpoint Edge autorizado, sesión válida y permiso de uso de datos.

## FIN DEL PROMPT

---

## Nota de auditoría

Durante la preparación de este relevo no se modificó código de producción, base de datos, contenedores, sesiones ni procesos. Sólo se leyó el workspace, se ejecutaron typecheck/tests/build/validación de migraciones, se consultaron metadatos/puertos y se hicieron consultas SQL agregadas de sólo lectura. El único archivo añadido es este documento.
