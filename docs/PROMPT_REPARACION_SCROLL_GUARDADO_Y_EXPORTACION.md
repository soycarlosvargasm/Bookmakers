# Prompt de reparación: scroll manual, Detener y registros de hoy

Trabaja en `/Users/User/Desktop/SPORTSBOOK COLLECTOR `, con un espacio al final. Repara el funcionamiento real de la aplicación nativa. El usuario ha rechazado la entrega anterior porque el scroll manual no funciona, Detener falla y los registros de hoy dejan de aparecer cuando cierra y vuelve a abrir. No hagas otro rediseño como sustituto de estas reparaciones.

La decisión vigente es **PostgreSQL local**, no Supabase. Usa la conexión local existente de `.env.local` sin mostrar sus credenciales. No crees otra base de producción ni cambies el destino a una base de pruebas.

## Qué hice mal como agente anterior

1. Di por terminado el trabajo apoyándome en controles visibles, pruebas con mocks y páginas de prueba. No comprobé el recorrido completo en la aplicación usada por el usuario: abrir la fuente correcta → scroll manual → extraer cuotas → persistir → cerrar → reabrir → recuperar los mismos registros.
2. Dejé al usuario trabajando con `Sportsbook Collector Review.app`, una ventana de revisión conectada al servidor del script `scripts/verify-workbench-native.ts`. Ese script crea un `dataDir` temporal mediante `mkdtemp` y llama a `createUiServer` sin `ingestSnapshots: true` ni `manageDatabase: true`. Conservé esa conexión para no interrumpir una captura, pero no completé el traslado al entorno permanente. Fue un error entregar esa ventana como aplicación terminada.
3. El modo manual que implementé guarda texto, pero no extrae sus apuestas: `ManualReading.read()` escribe `payload.records: []` y `recordCount: 0`. El ciclo manual informa éxito si hay vistas guardadas, aunque tenga cero registros. No debí presentarlo como un flujo completo de captura de enfrentamientos y cuotas.
4. `ManualReading` abre un Chromium nuevo con `chromium.launch({headless:false})` y `newContext()`. No utiliza el Chrome Renzo que el usuario usa para abrir sus fuentes. Las pruebas con un contexto inyectado no comprobaron esa discrepancia en las páginas reales.
5. El aviso modal de verificación bloqueaba el botón Detener de la pantalla. Además, `/api/ocr/stop` podía devolver `stopped: 0` si la captura estaba en HTTP, en verificación o en cola, antes de tener progreso visual. Los controles no compartían un estado de cancelación fiable.
6. Dejé «Registros hoy» como un contador sin una acción para extraer los registros guardados. No comprobé que ese contador y sus registros se mantuvieran después de reiniciar.
7. Los resultados de una suite anterior no demostraban que funcionaran estos flujos reales. No vuelvas a usar pruebas antiguas para afirmar que la reparación actual está terminada.

## Evidencia y estado que debes preservar

En la revisión realizada el **12 de octubre de 2026, Asia/Bangkok**:

- La ventana de revisión usa el puerto **3447** y el directorio `/var/folders/x0/bzwwhcfs1yqbk47z1xz791lc0000gn/T/workbench-native-kNkxiK`.
- Su configuración está en `Sportsbook Collector Review.app/Contents/Resources/launch.json`, dentro de ese directorio.
- La app principal está en `dist/ui-macos/Sportsbook Collector.app`. Su configuración apunta al proyecto permanente y al puerto **3001**. Comprueba ambos servidores y sus procesos antes de actuar: pueden seguir vivos o haber cambiado.
- En la carpeta temporal se encontraron **22 capturas reales** y **8 capturas de prueba**. Ninguna de las 22 huellas SHA256 reales figuraba en `collector_captures` ni en `snapshot_loads` de la base local. La evidencia detallada está en `.audit/repair-handoff-evidence.json`. Repite el inventario porque el usuario puede haber seguido capturando.
- La base local sí contenía **755 capturas archivadas**, **217 snapshots normalizados** y **128.561 observaciones de cuota**. Esos totales no prueban que estén guardadas las capturas recientes de la ventana temporal.
- Los ejemplos antiguos no siempre tienen flags de prueba. En ese directorio, `evidence.transport` igual a `local-fixture` o `fixture-only` identifica ejemplos. No los incorpores como apuestas reales.

**No borres la carpeta temporal, RAW, textos, imágenes, recibos, checkpoints ni runs.** Primero preserva y recupera las capturas reales. No afirmes que fueron eliminadas: siguen existiendo en disco en el último inventario.

## Cambios iniciados que quedaron sin terminar

El agente anterior dejó cambios parciales que debes revisar, no asumir correctos:

- `public/ui/index.html`: añadió `challengeStop`, «Detener todo», dentro del aviso de verificación.
- `public/ui/app.js`: unifica botones mediante `window.stopCollector`, solicita `/api/stop` y consulta estado hasta confirmar que el motor está inactivo. Evita reabrir el aviso mientras detiene.
- `public/ui/workbench.js`: escucha eventos de cancelación compartidos e invalida respuestas tardías de inicio/lectura.
- `src/ui/server.ts`: amplía el estado a todas las capturas activas, elimina la exclusión visual de `/api/ocr/stop` y añade guardas de versión a algunos inicios. Añade `/api/storage/status`.
- `migrations/021_capture_archive.sql` y su copia en `supabase/migrations/`: crean `collector_captures` para conservar el JSON completo. **La migración ya fue aplicada a la base local.** No elimines la tabla ni sus datos.
- `src/snapshots/loader.ts`: intenta archivar la captura completa antes de normalizar, incluso si ya se importaron sus cuotas. Excluye ejemplos explícitos y los dos transportes de prueba citados.
- `src/ui/ingestion.ts`: incorpora estado de sincronización. `app.js` intenta mostrarlo en `#storageStatus`, pero ese elemento todavía no se añadió al HTML.
- `tests/ui-challenge.test.ts`: incorpora una regresión para detener una verificación HTTP y su cola.
- `tests/ui-ingestion-live.test.ts`: incorpora comprobaciones de archivo completo y texto todavía no interpretado. **Estos cambios de persistencia no recibieron la validación final.**
- `tests/ui-stop-controls.test.ts`: la prueba nueva quedó fallando. El último intento detectó un evento de navegación adicional, `collector-section-changed`, en una aserción que esperaba únicamente eventos de cancelación. Corrige el arnés sin debilitar la comprobación funcional.

No se completó la migración de las capturas temporales, la activación de la app permanente, la reparación del modo manual ni el botón para extraer los registros de hoy. No hay una entrega final verificada de estos cambios.

## Qué debes cambiar

### 1. Una aplicación y un almacenamiento permanente

Establece un `dataDir` permanente y único para la app real. Reabrir no debe crear un nuevo directorio de pruebas ni conectar silenciosamente con otra carpeta o servidor. Separa la raíz del código, la raíz de datos y la configuración de lanzamiento cuando sea necesario.

Recupera las capturas reales del directorio temporal y sus archivos asociados en el almacenamiento permanente. Mantén el contenido original y sus huellas; evita duplicados. Conserva evidencia y progreso recuperable, y excluye fixtures de los datos reales. Haz una copia antes de sustituir cualquier archivo existente.

Activa la ingestión automática en la app utilizada por el usuario. Cada captura debe quedar durable en disco y en PostgreSQL: evidencia completa, texto capturado, fuente, URL, fechas y, cuando estén validados, enfrentamientos, mercados, selecciones y cuotas originales. Un texto aún no interpretado debe persistir como pendiente; no desaparecer ni contarse como una extracción de cuotas exitosa.

Si PostgreSQL falla, conserva una cola durable y reintenta sin duplicar. Al reabrir, reconstruye historial, pendientes y contador desde los datos persistidos, no solo desde mapas en memoria. Recupera también la información necesaria para consultar la procedencia de cada fila.

### 2. Scroll manual realmente conectado a la página del usuario

Revisa `src/ui/manual-reading.ts`, `src/ui/actions.ts`, `src/ui/workbench.ts`, `public/ui/workbench.js`, `public/ui/collection.js`, `src/engine/renzo-browser.ts` y `src/visual/readiness.ts`.

El modo manual debe vincularse inequívocamente con la fuente y la pestaña correctas del Chrome Renzo existente. No abrir otro navegador o contexto como sustitución silenciosa. Muestra la página y URL efectivamente activas, y confirma que está lista antes de habilitar la lectura.

El usuario hace el scroll. El programa no debe mover la página, cambiar de pestaña ni iniciar recorridos automáticos en este modo. Al pulsar el control de lectura/extracción, lee el contenido de la vista correcta, extrae solo asociaciones demostrables entre evento, mercado, opción y cuota, y guarda tanto la evidencia como los registros validados. No mezcles cuotas de tarjetas, mercados, casas o vistas diferentes. Si una asociación no se demuestra, conserva el fragmento como pendiente con un motivo concreto.

Revisa redirecciones legítimas de las fuentes: la comprobación actual de origen exacto puede impedir leer una página redirigida. Define destinos admitidos de forma explícita; no aceptes arbitrariamente otras páginas.

No declares éxito porque el navegador abrió o porque aumentó `savedViews`. Distingue página abierta, texto guardado, cuotas extraídas y persistencia confirmada. Comprueba la causa real de la apertura/lectura fallida, además de corregir la ausencia de extracción.

### 3. Detener en cualquier fase

Todos los botones Detener, incluido el del aviso, deben cancelar apertura, HTTP, lectura manual, recorrido automático, verificación pendiente, programación y fuentes en cola. Cancela también inicios pendientes: una respuesta tardía no debe reactivar la captura ni anunciar que empezó después de detener.

Mantén «Deteniendo…» hasta confirmar el estado real. Libera los controles cuando corresponda, permite reintentar si no se confirma y conserva las escrituras que ya empezaron. Cierra únicamente recursos que pertenezcan al colector, nunca todo Chrome Renzo ni sus pestañas personales.

### 4. Registros de hoy persistentes y botón para extraerlos

Añade junto al contador **«Extraer registros de hoy»**. Debe permitir obtener los registros guardados de ese día y exportarlos en **CSV y JSON**, con un estado vacío o error claro si corresponde. No debe iniciar otra visita a las fuentes para exportar lo que ya está guardado.

«Hoy» corresponde a la **fecha de captura en Asia/Bangkok**, no a la fecha del partido ni al filtro de cuotas de los últimos 15 minutos. Conserva y permite recuperar ese día después de cerrar y reabrir. Ofrece selección de fecha para consultar días anteriores.

El número mostrado y el contenido exportado deben tener el mismo alcance documentado. No sumes ejemplos, confundas vistas con cuotas, ni pierdas filas por paginación. Define de forma explícita la deduplicación y conserva las versiones cuando representen capturas distintas.

La exportación debe incluir fuente/casa, URL, país de competición cuando esté demostrado, liga, evento, mercado, opción, cuota original, formato original, fecha de captura e identificador de evidencia. No inventes países, equipos, mercados o precios faltantes. Separa las filas validadas de las pendientes si hace falta y muestra ambos recuentos.

## Pruebas obligatorias antes de entregar

1. En la **app nativa real**, abre una fuente seleccionada en Chrome Renzo, activa modo manual, desplázate tú y extrae dos vistas distintas. Comprueba que no hubo scroll ni navegación automáticos y que ambas vistas produjeron evidencia y registros persistidos correctamente asociados.
2. Detén mientras abre, mientras lee, durante una verificación HTTP, durante un recorrido automático y con fuentes en cola. Comprueba que no se inician más fuentes, no aparecen escrituras nuevas no solicitadas y el motor confirma inactividad. Conserva lo ya guardado.
3. Captura registros con un número conocido, consulta sus filas en PostgreSQL y verifica sus cuotas originales. Cierra completamente app y backend; vuelve a abrir la app principal y comprueba que reaparecen la misma fecha, el mismo recuento y las mismas filas.
4. Pulsa «Extraer registros de hoy» antes y después del reinicio. Abre CSV/JSON y compara sus filas y evidencia, incluyendo un resultado que exceda una página de la interfaz.
5. Comprueba fallo temporal y recuperación de PostgreSQL, reintento idempotente, cambio de día en Asia/Bangkok, rechazo de fixtures y conservación del texto pendiente de interpretación.
6. Ejecuta typecheck, build y pruebas pertinentes. Las pruebas de integración deben usar una base **aislada**; no insertes ejemplos en la base del usuario. Hay un arnés disponible en `scripts/verify-collector.mjs`.

Entrega evidencia del flujo real: app utilizada, raíz permanente de datos, conexión local, captura/recuperación al reiniciar, filas verificadas y archivos exportados. Si algo falla, dilo y explica el bloqueo concreto. No declares terminado el trabajo por el aspecto de la interfaz ni por una suite con partes críticas omitidas.

Mantén el alcance deportivo acordado: **enfrentamientos y cuánto paga cada opción**, organizados por país, liga y equipo. Sin alineaciones, bajas, estadísticas, noticias, minuto del partido, análisis, pronósticos ni importación de logos. Conserva EXPRESS por país para abrir todas sus páginas juntas; no lo presentes como extracción simultánea.
