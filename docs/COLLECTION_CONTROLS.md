# Colección con memoria y selección — 10 de octubre de 2026

La aplicación de macOS conserva la pantalla principal y las pestañas de Fuentes, Data, Changes, Live logs y Ajustes. La pestaña existente **Progreso y capturas** reúne OCR, extracción, filtros, fichas finales y evidencia. El administrador se abre dentro de la app; el backend de producción rechaza solicitudes sin la sesión de la app. No se abre un navegador para el administrador.

## Iniciar automáticamente

En **Progreso y capturas**, pulsar **Extraer todo**. Para una colección limitada, abrir **Elegir fuente, país, URL, fechas o pestañas · saltar secciones**, elegir el alcance y pulsar **Iniciar**. No se necesita configurar fechas, mercados, OCR ni límites. El motor recupera la selección guardada en ejecuciones limitadas, respeta los saltos y reanuda pendientes; en modo país conserva el perfil de cada fuente salvo que el usuario configure una selección común. **Detener** y **Saltar…** permanecen disponibles.

**Elegir qué copiar…** abre una pantalla separada para restricciones opcionales; los límites de tiempo y consumo están plegados dentro de ella. **Guardar selección** la conserva y vuelve al flujo principal. **Restablecer automático** recupera los valores por defecto; guardar después reemplaza un perfil anterior. La información técnica de OCR, modelo, tokens y último recorrido se consulta en **Ajustes**. **Evidencia** tiene su propia pantalla.

## Limitar una corrida (opcional)

1. Seleccionar una fuente, país o URL personalizada. Una URL personalizada comienza por defecto en **Solo esta URL**.
2. Elegir **Solo esta URL**, **Solo esta sección** o **Explorar el sitio**. Una sección respeta el prefijo del path, los parámetros de su URL y su ruta por hash. Solo se siguen páginas del mismo origen.
3. Elegir fechas de eventos, deportes, ligas y mercados. Las fechas usan Asia/Bangkok; un rango explícito excluye eventos sin fecha verificable. El control de fechas pasadas conserva eventos explícitamente en vivo. Desactivarlo permite adquirir historial solicitado.
4. Usar **Descubrir páginas y pestañas** para leer el inventario observado de la página, sin iniciar un recorrido ni llamadas a OpenAI. Activar las casillas de restricción para procesar exclusivamente las páginas/pestañas seleccionadas. Un inventario no acredita cobertura de todo el sitio.
5. Ajustar tiempo máximo, vistas y llamadas de IA. Cero llamadas evita el uso de visión. La extracción HTTP/red/DOM/accesibilidad conserva prioridad sobre OCR/visión.
6. Guardar la selección para reutilizarla en corridas normales y scheduler, o iniciar la exploración con la selección actual. En modo país se aplican las preferencias enviadas a cada fuente; los perfiles específicos se recuperan cuando no se envía una selección común.

Los adaptadores que consultan feeds de toda la fuente se evitan al pedir un alcance restringido o selecciones/exclusiones: se observan las respuestas de la página seleccionada. El sitio puede solicitar sus propios feeds generales al cargar; no todos los proveedores permiten limitar su respuesta por liga/fecha antes de descargarla.

## Saltar sin borrar

**Saltar…** está disponible en el formulario, en cada marca del país, en páginas/pestañas descubiertas y en el historial. Permite fuente, URL, liga, deporte, mercado, pestaña o fecha, durante la corrida actual/próxima, hasta mañana, hasta una fecha o hasta reactivar. Las reglas se guardan en disco y se revisan entre vistas; un salto de fuente cancela únicamente esa fuente y conserva el resto de la cola. **Reactivar** elimina la exclusión. Las solicitudes que ya están en curso pueden finalizar antes de aplicar un salto de sección.

## Memoria y reanudación

Los checkpoints se guardan por fuente y selección; modificar el presupuesto no impide recuperarlos. Conservan páginas pendientes y referencias de RAW, pero no restauran precios antiguos como nuevas capturas. Las vistas incompletas se reconstruyen al reanudar; las vistas completas recientes se omiten mientras su período de actualización sigue vigente. El recorrido de Betfair conserva también rutas de controles y colas de mercados. Las cuotas de eventos futuros/en vivo vuelven a leerse cuando requieren actualización.

Una fecha de inicio pasada no prueba que un evento terminó. El archivo automático de una URL exige una vista completa sin errores y estados terminales explícitos de todos sus eventos, con fecha pasada verificada. Una URL fechada o de evento ya archivada se omite antes de adquirirla. Las páginas dinámicas generales no se archivan permanentemente solo porque en una captura mostraron eventos terminados. Las fechas explícitas excluidas se omiten en enlaces/controles antes de abrirlos.

La cobertura se refiere a las vistas y al alcance descubierto/seleccionado; no es una garantía de todos los mercados posibles del proveedor. Fallos de navegación, extracción o validación y agotamiento de IA dejan cobertura parcial. Una pantalla de error del navegador se descarta antes de OCR/visión. Se reutilizan respuestas de visión idénticas dentro de una ejecución cuando coinciden imagen y contexto, sin reasignar precios de imágenes diferentes.

## Datos y evidencia

- `.engine/raw/`: JSON inmutable y PNG/tramos de extracción; los datos adquiridos por métodos estructurados pueden no tener screenshot.
- `.engine/collection/profiles/`: selecciones por fuente.
- `.engine/collection/rules.json`: exclusiones y duración.
- `.engine/collection/checkpoints/`: recorrido completo/parcial y pendientes.
- `.engine/collection/coverage/`: liga, fecha del evento, mercado y cobertura de la vista.
- `.engine/collection/receipts/`: registros capturados, capturas vinculadas y estado de carga a la base.
- `.engine/collection/inventory/`: páginas y pestañas observadas al descubrir.

**Evidencia** permite filtrar por fuente, revisar lo recorrido/omitido, reanudar, reactivar exclusiones y ver texto/PNG dentro de la app. Distingue captura guardada, resumen, carga pendiente, carga confirmada, archivo vacío y fallo de carga. Las capturas anteriores se indexan progresivamente; su carga permanece sin verificar hasta que el cargador la corrobora.

## Validación

Pruebas con fuentes controladas cubren alcance exacto y por sección, parámetros/fragmentos, selección de mercados, saltos persistentes por corrida, archivo conservador, reanudación sin precios viejos, agotamiento de vistas/IA, bloqueo de pantallas de error, evidencia vinculada y acceso exclusivo de la sesión de la app. La suite completa se ejecuta con PostgreSQL en un contenedor temporal, sin modificar la base de producción ni realizar llamadas de visión pagadas.

Resultado de la suite completa: 167 pruebas aprobadas, cero fallos y cero omitidas. Incluye creación y persistencia de fichas, separación de mercados/casas, filtros, copia de texto con carga demorada y rechazo de pantallas y canvas vacíos. Registro local: `.engine/verification/collection-controls/tests.log`. La app nativa se verificó con datos existentes: ordenar un partido, guardar su ficha y recuperarla tras reiniciar; el administrador sin sesión de la app devuelve HTTP 403.

## Flujo orientado a partidos

La pestaña existente **Progreso y capturas** muestra **1. Extraer**, **2. Ordenar y filtrar**, **3. Apuesta final**, además de los controles de selección y saltos. Las capturas se muestran como miniaturas visibles en la misma pestaña; pulsarlas abre la imagen original. El botón **Extraer** está junto al selector **Modo de lectura**. La memoria se consulta en un apartado plegable. La pantalla principal, los indicadores del encabezado, las fuentes por país y las pestañas anteriores se conservan. Se retiraron los totales de capturas, registros y archivos cargados de la vista de evidencia.

**Extraer todo** pone todas las URLs únicas del catálogo en cola, recorre los mercados dentro de los límites de ejecución y conserva memoria/saltos. Las fuentes que requieren VPN o verificación conservan esa restricción real. La extracción de una sola fuente, país o URL sigue disponible como opción secundaria.

**Ordenar y filtrar** usa las últimas observaciones por selección, agrupadas por deporte, liga, fecha, partido, mercado y casa. No mezcla las cuotas de dos casas ni fusiona mercados con identidad diferente. Conserva las cuotas originales y permite limitar los partidos usados en la salida. Las fechas de filtros son inclusivas en Asia/Bangkok; precios antiguos muestran que deben actualizarse.

**Crear apuesta final** guarda fichas de partidos con sus opciones y precios observados en `.engine/bets/`. Los mercados incompletos, sin liga/fecha confirmadas o con cuotas explícitamente sin corroborar quedan pendientes. En 1X2 se conserva el empate; no se inventa una cuota faltante. Esta etapa no incluye stake, cálculo de pago ni envío a una casa de apuestas.

## Texto antes de imágenes

El motor copia texto visible de las vistas deportivas y lo conserva como `.txt` junto al JSON. Ese texto se consulta en **Evidencia**; no utiliza ni altera el portapapeles del usuario. Antes de analizar una vista espera precios presentes y contenido estable. Una vista con skeletons/carga sin cuotas se deja parcial, sin screenshot ni petición de visión. Las regiones vacías al desplazarse se omiten. Canvas con contenido pintado puede requerir OCR; una imagen sin cuotas legibles no se envía a visión ni se guarda como captura de datos. Los screenshots de diagnóstico de fallos se conservan aparte.

## Scroll y copiar texto sin screenshots

En **Progreso y capturas → Capturas y texto**, **Modo de lectura → Scroll y copiar texto · sin screenshots** activa un recorrido con desplazamiento que conserva el texto visible de cada tramo. La opción de lectura se recuerda en la app. Se bloquean las capturas, OCR y solicitudes de visión, incluyendo navegación mediante imágenes. Red/DOM/accesibilidad pueden extraer los precios directamente; las vistas sin cuotas estructuradas conservan su texto como evidencia y sus cuotas quedan pendientes. Las páginas que solo dibujan las cuotas en canvas quedan pendientes en este modo. **Automático · capturas solo como respaldo** permite recuperar la alternativa de OCR cuando sea necesaria.
