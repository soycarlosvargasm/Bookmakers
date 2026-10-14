# Fuentes y ligas para ampliar el colector

Investigación: 5 de octubre de 2026, Asia/Bangkok.

## Alcance y evidencia

La investigación inicial se hizo mediante el servicio de investigación web. Posteriormente se comprobaron los cinco enlaces en el Chrome existente, perfil **Renzo**, con la VPN de Chipre mostrada por el usuario. Los resultados iniciales de lectura web no sustituyen esas comprobaciones locales.

**Corrección de alcance del usuario:** instalar las fuentes en la app Mac; el usuario ejecutará las capturas. No se ejecutarán nuevas adquisiciones para comprobar la instalación.

Se añadieron inicialmente nueve entradas a `config/brands.json`, todas en **Global**: Bet Hero, OddsPortal, Houdini Predictions, Soccerbase, RotoWire Soccer, BetExplorer, Oddspedia, Oddschecker y Covers. Global contiene 16 fuentes. Con el posterior pedido explícito del usuario de instalar fuentes UK, se añade **Reino Unido**: ahora hay nueve tarjetas, con botones por país y el endpoint individual compatible. La UI exige VPN activo también para Global. Esta indicación no comprueba técnicamente el estado del túnel.

Las nueve entradas se dejan con `verified: false` y una nota visible: **la instalación en el catálogo no certifica extracción automática**. Reutilizan las rutas existentes del motor, sin modificar el motor ni `actions.ts`. Las comprobaciones de navegador se hicieron en Renzo; el motor existente continúa gestionando sus propias sesiones. No se cambió esa gestión de sesiones.

## Reino Unido: las cuatro naciones

### Fuentes UK instaladas en la app Mac

Se registran ocho fuentes nuevas bajo **Sources → Reino Unido (UK, 🇬🇧)**. Los botones `Run Reino Unido` y `Force browser Reino Unido` usan la cola secuencial existente. No se ejecutaron capturas para verificar esta instalación; `verified: false` y las notas visibles indican que el acceso y la extracción automática siguen pendientes.

| Fuente | URL configurada |
| --- | --- |
| Betfair Sportsbook | https://www.betfair.com/betting/football/ac-1 |
| Paddy Power | https://www.paddypower.com/football |
| Sky Bet | https://skybet.com/football/s-1 |
| William Hill | https://sports.williamhill.com/betting/en-gb |
| Ladbrokes | https://sports.ladbrokes.com/sport/football |
| Coral | https://sports.coral.co.uk/sport/football/matches |
| Betfred | https://www.betfred.com/sports/football |
| BetVictor | https://www.betvictor.com/en-gb/sports/240 |

Las webs oficiales identifican estas páginas deportivas. La apertura local de Sky Bet en Chrome Renzo mostró una comprobación de seguridad de Cloudflare; BetVictor mostró inicialmente la cabecera de su página UK. Ninguna de esas observaciones certifica extracción automática. Reino Unido representa el mercado de la fuente, no un filtro que limite los eventos a Inglaterra. No se promete cobertura completa de las cuatro naciones en cada operador.

El usuario conectó ProtonVPN a **United Kingdom, UK#186**. El estado conectado se confirmó en la app Proton VPN. Con esa salida activa, se abrieron [OddsPortal Football](https://www.oddsportal.com/results/football/) y [BetExplorer Football](https://www.betexplorer.com/football/) en Chrome de Renzo. Ambos catálogos muestran Inglaterra, Escocia, Gales e Irlanda del Norte. BetExplorer marcaba categorías de fútbol para las cuatro en su listado. No se guardó ninguna cuota en esta comprobación.

Se actualizó la nota visible de OddsPortal y BetExplorer en Sources para nombrar las cuatro naciones. Se conservan en Global; no se convierten en tarjetas de país ni se asume que UK equivale a Inglaterra. Estas páginas ya listan sus ligas sin tener que abrir una URL distinta por nación.

Antes de esta corrección se guardaron capturas de investigación de Houdini y Bet Hero mediante el almacenamiento existente. Quedan como antecedentes, no como validación de nuevos conectores automáticos. Se retiró el importador temporal para no seguir capturando durante esta tarea.

La condición del usuario es mantener la VPN encendida para todas las fuentes, incluidas las globales. El país de salida de la VPN y el país de una competición son datos distintos. Una fuente global puede contener ligas de muchos países; su cobertura no exige crear una tarjeta por liga o país. Que funcione con una salida concreta requiere una prueba independiente.

La consulta local `scutil --nc list` informó que el servicio ProtonVPN estaba `Disconnected`, pero fue insuficiente para describir la conexión: el usuario mostró Proton conectado a Chipre. La página de Houdini también identificó Chipre durante la comprobación local.

No se consultaron ipapi.co/ipwho.is. No hace falta esa consulta para registrar las fuentes.

## Resultado local en Chrome de Renzo

| Fuente | Comprobación real | Instalación |
| --- | --- | --- |
| Bet Hero | Portada con 1.378 enlaces de eventos observados. Se leyeron tablas por operador para Grecia, Noruega, Mongolia y Eslovaquia, además de la prueba Chipre–Letonia. No se capturaron todos los eventos del catálogo. | Configurada en Global; extracción automática pendiente. |
| OddsPortal | La página de fútbol cargó con 59 filas de eventos y precios 1/X/2. La propia página indica que la portada muestra máximos entre casas; no atribuir esos precios a una casa concreta. | Configurada en Global; extracción automática pendiente. |
| Houdini | Diez partidos de Argentina, Noruega, Serbia, Colombia, Paraguay y Eslovaquia con precios 1/X/2. Incluye partidos finalizados y programados; origen bookmaker no establecido. | Configurada en Global; extracción automática pendiente. |
| Soccerbase | Calendario visible; columnas de cuotas vacías durante la comprobación. | Configurada en Global; cuotas no confirmadas. |
| RotoWire | El 5 de octubre mostró que no había cuotas disponibles. La vista del día 6 también tenía celdas sin precio en el partido leído. | Configurada en Global; cuotas no confirmadas. |
| BetExplorer, Oddspedia, Oddschecker, Covers | Investigación inicial y enlaces identificados; no se afirma una captura local ni disponibilidad con la VPN actual. | Configuradas en Global; acceso y extracción pendientes. |

Las ligas son cobertura de una fuente global, no tarjetas de país nuevas. Mantener la salida VPN en Chipre no restringe la selección de ligas a Chipre.

## Investigación inicial de los cinco enlaces (resultados previos a Renzo)

| Fuente | Resultado observado | Utilidad y próximo paso |
| --- | --- | --- |
| [Bet Hero](https://betherosports.com/odds/soccer) | Lista de partidos y ligas legible: Argentina, Paraguay, Uruguay, Jamaica, Grecia, Noruega, Irán, Mongolia y otras. Anuncia comparación de cientos de casas. | Candidato global con cobertura amplia; el número anunciado no es cobertura comprobada del colector. |
| [OddsPortal](https://www.oddsportal.com/football/) | La lectura redirigió a `/pl/football/`. Menús de ligas y contenido informativo disponibles; no apareció una tabla de cuotas numéricas de partidos en la lectura. | Ya figura en el catálogo del repo para otros deportes. Su página de fútbol y extracción concreta necesitan prueba con navegador. |
| [Houdini Predictions](https://houdinipredictions.com/soccer-odds) | Filas legibles con competición, equipos, hora y cuotas 1/X/2. Marruecos Botola Pro: Raja Casablanca–CR Khemis Zemamra, 1.36 / 3.80 / 9.00. También Argentina, Irlanda del Norte y Brasil. | Primera prueba técnica propuesta por la claridad del dato. La página leída indicaba «Today 3 Oct»; no tratar ese contenido como fresco al 5 de octubre. El origen bookmaker de cada cuota no quedó identificado. |
| [Soccerbase](https://www.soccerbase.com/matches/home.sd) | Fixtures y columnas HOME/DRAW/AWAY; las columnas de cuotas estaban vacías. | Útil como candidato para calendario. Cuotas sin confirmar. |
| [RotoWire](https://www.rotowire.com/betting/soccer/) | Selectores EPL, Champions, MLS, Bundesliga, Liga MX, Serie A, EFL y Ligue 1. El bloque de precios quedó en «Loading Soccer Odds…». | Candidato que requiere renderizado con JavaScript; no hay extracción de precios confirmada. |

Se siguieron dos detalles para evitar confundir una portada con cuotas capturables:

- [Bet Hero: Chipre–Letonia](https://betherosports.com/odds/soccer/cyprus-vs-latvia/9HlVl0): anuncia mercados y casas, pero la lectura no mostró precios numéricos por casa. No confirma un feed extraíble ni su frescura.
- [Soccerbase: Chipre–Letonia](https://www.soccerbase.com/matches/more_markets.sd?id_game=955841): muestra nombres de mercados; sin precios en la lectura.

## Continuación de la búsqueda: ligas de otros países

[BetExplorer fútbol](https://www.betexplorer.com/football/) publicó las siguientes competiciones. Confirmar la presencia en el listado no confirma cuotas actuales disponibles para todas ellas.

| País | Competiciones observadas |
| --- | --- |
| Japón | [J1 League](https://www.betexplorer.com/football/japan/j1-league/), J2, J3 |
| Corea del Sur | [K League 1](https://www.betexplorer.com/football/south-korea/k-league-1/), K League 2, K3, K4 |
| Chipre | [Cyprus League](https://www.betexplorer.com/football/cyprus/cyprus-league/) |
| Argentina | Liga Profesional, Primera Nacional, Primera B/C |
| Chile | Liga de Primera, Copa Chile |
| China | Super League |
| Grecia | Super League 2 |
| Bulgaria | efbet League, Vtora liga |
| Croacia | HNL |
| República Checa | Chance Liga, ChNL |
| Dinamarca | Superliga |
| Ecuador | Liga Pro |
| Kazajistán | Premier League |
| Sudáfrica | MTN 8 Cup, Diski Challenge |

[Oddspedia fútbol](https://oddspedia.com/football/odds) y [Oddschecker fútbol](https://www.oddschecker.com/football) también están en el catálogo del repo. Una entrada marcada ACTIVA en ese archivo no sustituye una captura reciente ni demuestra acceso desde Chipre. BetExplorer y los otros cuatro dominios enviados por el usuario no aparecieron en ese catálogo.

Otros candidatos encontrados:

- [Superbet Rumanía](https://superbet.ro/pariuri-sportive/fotbal): contenido leído con precios 1X2 y menú de SuperLiga rumana. Acceso desde Chipre y conector pendientes.
- [Hollywoodbets Sudáfrica](https://app.hollywoodbets.net/betting): web de apuestas con oferta deportiva. Existencia verificada; extracción y acceso desde Chipre pendientes.
- [Covers](https://www.covers.com/sport/odds): página de comparación de cuotas; candidato adicional para deportes norteamericanos. Acceso y precios capturados por el motor pendientes.
- [Football-Data](https://football-data.co.uk/data.php): resultados y cuotas descargables para investigación histórica/prematch. No es un feed live. Advierte que las cuotas Pinnacle quedaron desactualizadas desde julio de 2025.

## Casas con dominio específico de Chipre

El [registro oficial Class B de la National Betting Authority](https://nba.gov.cy/en/regulated-entities/registers/class-b/) publica estas marcas y dominios. Es evidencia de existencia y registro; no prueba acceso mediante VPN, navegación sin cuenta ni extracción automatizada.

| Marca | Dominio publicado |
| --- | --- |
| Bet365 | https://www.bet365.com.cy |
| Bet on Alfa | https://www.betonalfa.com.cy |
| Meridian | https://www.meridianbet.com.cy |
| UBET | https://www.ubet.com.cy |
| Megabetplus | https://www.megabetplus.com.cy |
| Winmasters | https://www.winmasters.com.cy |
| Fonbet | https://www.fonbet.com.cy |
| Allwynbet | https://www.allwynbet.com.cy |
| Stoiximan | https://www.stoiximan.com.cy |
| IN2BET | https://www.in2bet.com.cy |
| CYBET | https://www.cybet.com.cy |
| Novibet | https://www.novibet.com.cy |
| CopyBet | https://www.copybet.com.cy |

## Alternativas mediante API

- [The Odds API: casas cubiertas](https://the-odds-api.com/sports-odds-data/bookmaker-apis.html), [documentación v4](https://the-odds-api.com/liveapi/guides/v4/): cobertura por regiones/casas, incluidos operadores de Reino Unido, Europa, Australia y Norteamérica. Requiere API key. Elegir una región en una llamada API selecciona datos; no cambia la VPN. No se probó ninguna llamada autenticada.
- [API-Football: cobertura](https://www.api-football.com/coverage): catálogo amplio de competiciones para fixtures y estadísticas. La cobertura de competiciones no implica que todas dispongan de cuotas. Requiere comprobar cada función y liga.

## Estado de entrega

Las nueve fuentes globales y las ocho fuentes UK están registradas en Sources → Global y Sources → Reino Unido, respectivamente, y entran en la cola existente al ejecutar el país. El usuario ejecutará los runs. Los conectores específicos y la extracción automática no quedan certificados por añadir entradas al catálogo. Las futuras capturas deben conservar solapamientos y no inventar un bookmaker ni timestamps que la fuente no identifique.
