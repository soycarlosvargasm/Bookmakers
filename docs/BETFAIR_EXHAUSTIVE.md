# Betfair: recorrido completo de fútbol

Vigente desde el 9 de octubre de 2026. Toda ejecución de la fuente `betfair`
activa la exploración completa, incluso desde Run, Force browser, por país y
el scheduler. No termina al encontrar la primera cuota ni al cambiar a Renzo.
La ejecución termina al agotar las rutas y controles descubiertos o al pulsar
Detener; no tiene un límite fijo de páginas, ligas o duración total. Cada
navegación y petición sí tiene un timeout; una vista que falla se reintenta una vez.

El motor sigue los enlaces observados de `/betting/football/` en el mismo origen:
competiciones, eventos, fechas y mercados. No mantiene una lista de ligas
preferidas. La muestra de navegación tomada de la captura real del 9 de octubre
contiene 245 competiciones, incluidas reservas y divisiones regionales.
`tests/fixtures/betfair-competition-links.html` conserva únicamente sus enlaces
y etiquetas deportivas; se eliminaron los scripts y el contenido de cuenta.

El recorrido es recursivo: descubre nuevos enlaces al desplazarse, abre pestañas
principales y anidadas, acordeones deportivos y controles de paginación/cargar
más. Restaura la ruta de controles para leer las ramas hermanas. Las pestañas
principales se programan una vez, evitando todas las permutaciones entre ellas.
Las huellas de navegación no incluyen cuotas en vivo; una variación de precio
no obliga a recorrer otra vez la misma vista.

Se utiliza una sola pestaña propiedad del collector. En Chrome Renzo se recorre
mediante el adaptador DOM/Apple Events y se leen los GET deportivos observados
sin limitar la lectura a ocho respuestas. No requiere CDP ni screenshots para
ese recorrido. En Chromium, OCR puede completar una vista con precios pendientes
de interpretar después de DOM y red. En Renzo, las vistas que necesiten OCR
quedan identificadas como cobertura parcial. La frontera pendiente y las cuotas
ya capturadas se conservan durante el cambio de navegador dentro del mismo run.

El perfil `betfair-sportsbook-v1` lee las etiquetas e IDs de evento, competición,
mercado y runner, fecha explícita, período, línea, jugador y cuota decimal,
fraccional o americana cuando esos campos están disponibles. El lector de
respuestas Sportsbook une los objetos `attachments.events`, `competitions` y
`markets` mediante sus IDs. No convierte escaleras Exchange back/lay en cuotas
Sportsbook. Las cuotas completas pasan por la validación y persistencia
existentes. No se inventan campos ausentes ni asociaciones ambiguas.

Cada vista guarda RAW por separado. El resultado contiene un informe de cobertura
con competiciones, eventos, mercados, vistas, pendientes y fallos. El progreso de
la app muestra esos contadores y `COBERTURA PARCIAL` si quedan fallos. Una vista
con precios que no pudieron asociarse a un evento/mercado/selección también
cuenta como fallo de cobertura. Detener conserva los RAW guardados.

Validación automatizada: las 245 competiciones observadas, paginación que revela
otro evento, pestañas hermanas y anidadas, diez pestañas sin crecimiento cuadrático,
pausa/resume, conservación de la frontera durante el cambio a Renzo, cobertura
parcial, cancelación, unión de feeds y ejecución del adaptador Renzo real contra
documentos Chromium locales. En esta última prueba se simula únicamente el
transporte del sistema operativo; no se usa la sesión personal del usuario.

Estas pruebas no demuestran que se hayan extraído todas las cuotas de Betfair
en vivo. La inspección de esa URL mediante Computer Use está bloqueada en esta
sesión. El informe de cobertura de un run real permite evaluar el alcance y las
vistas que todavía requieren ajustes del perfil.
