# App Mac: Chrome Renzo y Detener

**Nota vigente (2026-10-09):** la UI comienza con `browserMode: "isolated"`.
Cuando encuentra una verificación visible muestra **Ver opciones** desde el
primer bloqueo y un contador de intentos detectados. Después de **dos intentos
manuales**, si sigue bloqueada durante **seis segundos desde el segundo intento**,
cambia automáticamente a Chrome Renzo, sin pedir que vuelvas al administrador.
Los intentos adicionales no reinician esa espera. También cambia automáticamente
si el desafío reaparece tras una lectura limpia o vuelve a pausarse después de
una resolución. Si permanece bloqueada 30 segundos sin detectar esos intentos,
abre un aviso con tres decisiones:

- **Aceptar · Abrir en mi Chrome:** cierra únicamente el contexto de prueba del
  collector y vuelve a abrir la misma URL de la fuente en el perfil Renzo existente.
  Continúa dentro del mismo run y conserva las demás fuentes pendientes.
- **Seguir intentando:** mantiene la espera manual y rearma el aviso durante
  otros 30 segundos. No recarga ni resuelve la verificación automáticamente.
- **Cancelar esta fuente:** cancela solo esta fuente; la cola del país continúa.
  El botón general **Detener** sigue cancelando toda la cola y el scheduler.

El sistema observa pulsaciones reales del ratón y activaciones de teclado dentro
del marco de verificación, incluso cuando el control está en un Shadow DOM
cerrado. Detecta actividad manual; no afirma que cada pulsación haya enviado o
resuelto un desafío. No pulsa controles, lee tokens ni resuelve CAPTCHA.
Los marcos nuevos y recargados reciben el observador; al salir de la espera se
retiran sus listeners, script de inicio y binding. El contador y los logs permiten
comprobar si las pulsaciones llegaron al motor.
El tiempo esperando intervención humana no consume el presupuesto de adquisición.
Las decisiones incluyen el identificador de la verificación vigente: avisos
antiguos o decisiones duplicadas reciben 409 y no afectan a otro run.

En Chrome Renzo se lee mediante DOM y GET deportivos observados. Betfair dispone
de recorrido automático de ligas, eventos y mercados y conserva la frontera al
cambiar de navegador; ver [BETFAIR_EXHAUSTIVE.md](BETFAIR_EXHAUSTIVE.md). Las demás
fuentes mantienen la lectura de la página actual. Esa conexión no ofrece OCR.
El aviso y el progreso muestran estas capacidades. Si no puede conectar Renzo, informa el motivo sin abrir
otro navegador de prueba. La descripción del 5 de octubre que sigue es histórica;
actualmente Renzo se utiliza al aceptar el cambio o al activar el cambio automático.

Verificación del 9 de octubre: typecheck, build, sintaxis JavaScript y 22 pruebas
focalizadas distintas (desafíos, conexión Renzo, decisiones y cola por país).
En una página QA local, los botones reales permitieron seguir esperando, abrir
la URL exacta en Chrome Renzo y continuar hasta SUCCEEDED cuando la página dejó
de mostrar el bloqueo simulado. Los datos QA se aislaron y se retiraron.
En Betfair real se verificó el aviso automático en la app Mac con las tres
opciones. Se restauró la cola UK con Betfair y siete fuentes pendientes tras el
reinicio. En esa verificación anterior Betfair quedó en pausa para que el usuario elija; no se afirma que
Cloudflare esté resuelto ni que la extracción de esa fuente esté validada.

Corrección adicional del 9 de octubre: se reprodujo el fallo del contador anterior
con clics reales de Chromium en una casilla local dentro de un marco de otro
dominio con Shadow DOM cerrado. La prueba fallaba con el código anterior y pasa
con la corrección; verifica además recarga del marco, teclado, rechazo de eventos
sintéticos y retirada del observador. Pasaron build, typecheck, sintaxis JavaScript
y 27 pruebas focalizadas. En una prueba nativa local separada, los logs registraron
dos intentos y un tercero adicional; seis segundos después del segundo se abrió
la URL exacta en el Chrome personal Renzo y el run QA terminó SUCCEEDED. La prueba
usó almacenamiento temporal, separado de `.engine`, y no un CAPTCHA real.

La app `dist/ui-macos/Sportsbook Collector.app` usa el perfil existente llamado
`Renzo` para los runs manuales, por país y del scheduler. Identifica el proceso
personal de Chrome y abre una ventana propia con `--profile-directory`; no crea
un perfil Test, no exporta cookies y no sustituye Renzo por Chromium si falla.
La conexión usa un helper nativo con ScriptingBridge dirigido al PID concreto.
Solo cierra la pestaña que abrió el collector.

Chrome debe estar abierto y permitir JavaScript desde Apple Events. Un error de
conexión muestra su causa y termina el run. La app declara el uso de Apple Events
en su Info.plist para la autorización de automatización de macOS.

El botón **Detener**, fijo en la cabecera, llama a `POST /api/stop`. Cancela el
run actual, los runs en pausa, las marcas pendientes del país y el scheduler.
Las cancelaciones quedan en el historial de runs con la razón
`Detenido por el usuario`; conservan el esquema existente. No borra capturas
anteriores. La señal de cancelación se comprueba antes de persistir resultados.

La conexión Renzo permite leer DOM visible y respuestas JSON de URLs GET
deportivas observadas en la página. No ofrece CDP, capturas de pantalla,
árbol AX del navegador ni reproducción de GraphQL POST. Los handlers que
necesitan esas capacidades indican un MISS sin abrir otro navegador.
Registrar una fuente en el catálogo no valida su extractor: las nuevas fuentes
UK e India continúan marcadas como no verificadas.

Verificación del 5 de octubre de 2026: typecheck y 24 pruebas focalizadas pasaron.
La conexión real a Renzo pasó apertura, evaluación de JavaScript, navegación,
lectura DOM de una página local neutra y cierre de su propia pestaña. La app Mac
reiniciada muestra Detener y mantiene la cabecera visible al desplazarse.
Estas comprobaciones no ejecutaron fuentes reales ni guardaron cuotas.
