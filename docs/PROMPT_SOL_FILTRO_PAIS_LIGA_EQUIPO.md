# Prompt para Sol: filtro deportivo por país, liga y equipo

Este documento contiene el algoritmo y el encargo de implementación. Se preparó revisando el código y consultando únicamente inventarios de la base de datos en una transacción de lectura. En esta tarea de diseño no se modificó el código de la aplicación.

## Encargo

Trabaja en `/Users/User/Desktop/SPORTSBOOK COLLECTOR `; la carpeta tiene un espacio al final.

Implementa en «Progreso y capturas → Ordenar y filtrar» un catálogo visual para consultar las apuestas guardadas siguiendo esta jerarquía:

**País de la competición → deporte → liga / competición → equipo o participante → evento → mercado → selección → ofertas por casa → evidencia.**

El deporte puede funcionar como filtro transversal, sin exigir un clic adicional cuando solo hay uno. En deportes individuales usa «Participante»; en MMA distingue organización, cartelera y enfrentamiento. El usuario descargará los logotipos después. En esta tarea usa nombres completos y marcadores neutros; deja preparada la vinculación de imágenes para cuando se importen.

El objetivo es organizar y encontrar mercados deportivos correctamente asociados. No se solicita predecir ganadores, puntuar rentabilidad, recomendar importes, realizar apuestas ni construir combinadas. El formato de las cuotas no interviene en la identidad o en la selección de los resultados: conserva `rawOdds` y `rawOddsFormat` tal como estén guardados.

Implementa el resultado, compruébalo en la app nativa y entrega los cambios. Usa los siguientes hallazgos y reglas como especificación; verifica el estado actual de los archivos antes de editar.

## 1. Lo que existe y debe aprovecharse

| Pieza | Ubicación y uso actual |
|---|---|
| Fuentes y regiones de acceso | `config/brands.json`, `src/ui/brands.ts`, `src/ui/countries.ts`. El país corresponde a la fuente / VPN / región de acceso. |
| Datos normalizados | `src/normalization/types.ts`. Hay deporte, competición, participantes, evento, mercados, período, línea, casa, cuotas y fechas. Faltan campos específicos para país de competición e identidades de liga / participante en cada `ProviderRecord`. |
| Identidad de mercados y selecciones | `src/normalization/identity.ts`. Conserva las dimensiones que diferencian apuestas. |
| Correspondencias entre fuentes | `src/matching/service.ts`, migraciones `011`, `013`, `014`. Hay entidades canónicas, alias y decisiones de correspondencia. |
| Clasificación de RAW guardados | `src/ui/saved-evidence.ts`. Índice derivado y versionado, referencias a archivo / registro, mercados y pendientes. Es la base de la función solicitada. |
| Validación de asociaciones | `src/validation/records.ts`. Distingue `VALID`, `PARTIAL`, `AMBIGUOUS`, `UNRELATED`; `PARTIAL` puede contener una cuota correctamente asociada con metadatos incompletos. |
| Pantalla y API de organización | `src/ui/workbench.ts`, `public/ui/workbench.js`, sección correspondiente de `public/ui/index.html`. Hay filtros, sugerencias, control de respuestas tardías y acceso a evidencia. |
| Catálogo de PostgreSQL | `src/ui/catalog.ts`. Actualmente navega deporte → competición → evento; no aporta aún la jerarquía territorial ni los logos de esta función. No cambies la pestaña Data como parte de este encargo. |
| Logos | `docs/LOGO_PIPELINE.md`, `scripts/logos/pipeline.py`, `scripts/logos/load-db.mjs`, `migrations/019_sports_logos.sql`. Hay importación, candidatos, selección por entidad y vista `sports_entity_logos`. |
| Regresiones existentes | `tests/bfo-regression.test.ts`, `tests/rendered-dom.test.ts`, `tests/workbench.test.ts`, `tests/workbench-ui.test.ts`, `tests/collection-controls.test.ts`, `tests/manual-reading.test.ts`. |

Hallazgo de inventario al preparar este prompt: la base consultada contenía **532 participantes canónicos y 158 competiciones canónicas**, pero **0 entidades de logos, 0 assets, 0 candidatos y 0 logos seleccionados**. Esos recuentos no prueban que todas las identidades canónicas estén correctamente resueltas.

En `data/logos/` solo se encontró `entities.example.csv`, con filas de ejemplo. No existían `entities.csv`, `assets/` ni `out/selected.csv`. `public/ui/assets/logo.png` es la marca de la aplicación, no un escudo de equipo. El usuario confirmó que lo disponible es únicamente el sistema de importación y que él descargará los logos después. Sol no debe buscar, descargar ni importar logos en esta tarea, ni esperar a que el usuario los entregue. No existe una biblioteca final aportada para esta tarea. Implementa la conexión al catálogo existente y el estado «Sin logotipo», con nombres y marcadores neutros, sin bloquear el filtro por la ausencia de imágenes. No presentes el pipeline o el CSV de ejemplo como una biblioteca ya cargada; deja listo el enlace para que los logos aparezcan cuando se importen y se verifiquen sus correspondencias.

## 2. Separar los tres significados de país

Mantén campos distintos:

- `sourceRegion`: país/región donde se consulta una fuente. Puede proceder de `brands.json` cuando la URL regional coincide de forma inequívoca.
- `competitionTerritory`: país o territorio deportivo al que pertenece la competición.
- `participantCountry`: país del club o nacionalidad deportiva del participante, si está demostrado.

El filtro principal «País» utiliza **competitionTerritory**. La fuente / región de acceso tiene un filtro separado. Una liga inglesa capturada desde una fuente mexicana sigue bajo Inglaterra. Un club de un país que participa en una liga de otro se muestra bajo el territorio de esa competición en esa rama.

Representa por separado países o territorios deportivos reconocidos, competiciones internacionales, competiciones multinacionales y país desconocido. Inglaterra, Escocia, Gales e Irlanda del Norte pueden necesitar identidades deportivas propias; no reduzcas automáticamente todo a `uk`. El `global` de las fuentes no significa «competición internacional».

Obtén el territorio a partir de un campo estructurado de la competición o una correspondencia revisada con su identidad estable. No lo infieras del dominio, VPN, idioma, moneda, cuota, nombre de un artículo, país del rival o sede de un partido. Si varias evidencias se contradicen, registra conflicto y deja sin resolver la dimensión.

## 3. Modelo mínimo del índice derivado

Extiende la proyección de lectura existente; conserva los RAW, capturas y texto originales. Usa IDs como cadenas para no perder precisión con BIGINT.

```ts
type Resolution<T> = {
  value: T | null;
  status: 'verified' | 'unknown' | 'ambiguous' | 'conflict';
  basis: 'provider-id' | 'structured-field' | 'reviewed-crosswalk' | null;
  evidenceRefs: string[];
};

type EntityRef = {
  id: string;                 // Identidad interna estable y con tipo.
  kind: 'competition' | 'team' | 'national_team' | 'athlete' | 'card' | 'organization';
  displayName: string;
  sportId: string | null;
  externalIds: Array<{ provider: string; entityType: string; id: string }>;
  canonicalStatus: 'verified' | 'source-scoped' | 'unresolved';
};
```

La observación debe conservar, además de sus campos originales:

- Referencia al archivo RAW y al registro o fragmento que la demuestra.
- Fuente, URL y región de consulta por separado de la casa que ofrece el precio.
- Deporte; territorio de competición con procedencia; competición; edición / temporada si se conoce.
- Organización y cartelera cuando correspondan, sin presentarlas automáticamente como liga.
- Identidades de los participantes y sus roles, si se conocen.
- Identidad del evento y tipo: enfrentamiento, carrera / múltiples participantes, futuro u otro tipo demostrado.
- Mercado, reglas / variante, período, sujeto, línea y selección.
- `rawOdds`, `rawOddsFormat`, `eventStartTime`, captura original, observación y confirmación, cuando cada fecha exista.
- Resultado de validación de asociación, metadatos faltantes y conflictos.

Una relación equipo–competición es de muchos a muchos y, cuando hay información, pertenece a una temporada o edición. Derívala de eventos o de un catálogo explícito. Un equipo puede participar en liga y copa; no guardes una única liga permanente dentro del equipo.

## 4. Identidad antes de agrupar

Orden de resolución:

1. ID explícito del proveedor, dentro de su namespace y tipo de entidad, enlazado por una correspondencia comprobada.
2. Identidad canónica y alias revisados, sin conflictos y respaldados por evidencia compatible.
3. Alias exacto dentro de un contexto suficiente de deporte, tipo de entidad, categoría y territorio / competición. Si hay más de una entidad compatible, queda ambiguo.
4. Si no se demuestra una identidad global, conservar una identidad limitada a la fuente. Si tampoco existe ID de proveedor fiable, conservar una referencia técnica al registro / evento; no fusionarla globalmente por nombre.

Las similitudes de nombres sirven para proponer revisiones, no para fusionar entidades automáticamente. No uses el logo como prueba de identidad. Conserva diferencias como femenino, masculino, U21, U23, reservas, selecciones nacionales y distintas disciplinas. La búsqueda debe admitir Unicode, tildes y alias sin borrar esos calificadores.

Advertencias concretas del código existente:

- `stableName()` elimina determinados tokens y caracteres; no basta como clave global de equipos o ligas homónimas.
- `compareEvents()` puede aceptar deporte + competición + participantes sin fecha, y usa una tolerancia temporal en otros casos. No heredes esas decisiones como prueba suficiente de que dos capturas son el mismo encuentro o edición.
- El tratamiento de períodos en `semanticMarket()` puede convertir un período desconocido en partido completo. En este filtro, conserva **desconocido** salvo que el contrato del mercado/proveedor demuestre su alcance.
- Los IDs numéricos de `canonical_participants` y `canonical_competitions` pertenecen a tablas distintas. El `1` de una tabla no es el `1` de otra. Usa una correspondencia tipada como `participant:1` y `competition:1`, o equivalentes estables. Respeta IDs externos ya existentes mediante un crosswalk; no los renombres masivamente.

Para eventos, permite unificar evidencias cuando comparten una identidad de proveedor válida o una correspondencia revisada que demuestra la edición concreta. Mismos rivales y misma liga, sin fecha ni identificador de edición, no bastan. Un cambio de horario no debe crear automáticamente otro evento cuando el ID deportivo sigue siendo el mismo; conserva el historial del horario y su procedencia.

## 5. Fórmula de identidad de la apuesta

Separa el mercado, la selección, la oferta y la observación:

```text
MarketKey = H(
  EventIdentity,
  MarketTypeIdentity,
  PeriodIdentity,
  SubjectIdentity,
  MarketLine,
  RulesAndVariants
)

SelectionKey = H(MarketKey, OutcomeIdentity, SelectionLine, OutcomeVariants)

OfferKey = H(SelectionKey, BookmakerIdentity)

ObservationKey = H(OfferKey, SourceIdentity, EvidenceFile, EvidenceRowOrFragment)
```

`H` significa serialización canónica versionada y hash; no concatenes textos con separadores que puedan colisionar. `MarketTypeIdentity` distingue, por ejemplo, ganador de dos opciones, 1X2 y clasificar a la siguiente fase. Las reglas incluyen prórroga, penaltis, devolución, unidad estadística o modalidad cuando estén informadas.

Una dimensión desconocida no equivale a una dimensión conocida ni permite fusionar observaciones entre fuentes. Si falta información que impida demostrar equivalencia, incorpora la identidad local del mercado y limita la agrupación a esa evidencia / fuente. Si falta casa en un agregador, no sustituyas automáticamente ese dato por el nombre de la fuente.

El precio y su formato **no forman parte de MarketKey, SelectionKey u OfferKey**. Un movimiento de cuota produce otra observación de la misma oferta. Conserva todas las evidencias. Para la presentación, agrupa ofertas equivalentes por casa y muestra la observación más reciente cuya relación temporal y deportiva esté demostrada. Si no hay orden temporal fiable, muestra las observaciones con su incertidumbre, sin inventar cuál está vigente. Nunca compares `+180` y `2.80` lexicográficamente para decidir la mejor oferta.

Un futuro legítimo puede tener una temporada y una selección sin rival. No inventes un partido «A vs B» para encajarlo en la jerarquía. El evento o ámbito del futuro debe estar demostrado por su extractor; los formatos no compatibles permanecen pendientes.

## 6. Fórmula del filtro: todos los criterios sobre la misma observación

Sea `R` el conjunto de observaciones y `F[d]` el conjunto de valores seleccionados para cada dimensión `d`.

```text
predicate(r,d) = TRUE     si F[d] está vacío
                 UNKNOWN  si el dato de r necesario para d no está resuelto
                 TRUE     si el dato resuelto de r coincide con algún valor de F[d]
                 FALSE    en otro caso

match(r,F) = AND_trivalente(predicate(r,d) para todas las dimensiones)
```

Reglas del AND: cualquier `FALSE` produce `FALSE`; sin falsos y con algún `UNKNOWN`, produce `UNKNOWN`; solo todos verdaderos producen `TRUE`. Dentro de una dimensión las selecciones se unen con OR; entre dimensiones con AND.

```text
Resultados = { r : asociación(r) utilizable Y match(r,F) = TRUE }
Pendientes de filtro = { r : asociación(r) utilizable Y match(r,F) = UNKNOWN }
Pendientes de interpretación = evidencias o grupos ambiguos / sin interpretar
```

Los pendientes de interpretación siguen accesibles y explican qué filtros no se pueden comprobar; si una dimensión conocida contradice el filtro, no se presentan como coincidencias. El contenido informativo queda identificado como ajeno a mercados.

`PARTIAL` no es sinónimo de apuesta inválida: un evento sin fecha puede consultarse sin filtro de fecha. Con un rango de fecha de evento, pasa a pendientes de filtro. No utilices fecha de captura, fecha de noticia ni última observación para rellenar la fecha del evento.

**Filtro de equipo:** selecciona eventos donde participa ese equipo; permite consultar todos sus mercados, incluidos total de goles, empate y hándicap del rival. No lo interpretes como «apostar a que ese equipo gana». Si el usuario selecciona varios equipos, el comportamiento predeterminado es «participa cualquiera»; un modo «enfrentamiento entre ambos» deberá ser explícito.

Agrupa para presentar únicamente después de aplicar los filtros a cada observación. No combines el país de un registro con la liga o el equipo de otro para fabricar una coincidencia.

## 7. Facetas dependientes y listado visual

Los valores seleccionables se obtienen de datos utilizables dentro del alcance guardado elegido. Evita entradas que obliguen a adivinar cómo se escribió una liga o equipo. Usa controles de selección con búsqueda y etiquetas reconocibles; el valor interno siempre es el ID.

Para calcular las opciones de una dimensión `d`, evalúa los demás filtros:

```text
Facet(d,F) = valores verificados de d en observaciones utilizables
             que cumplen todos los filtros de F excepto el propio d
```

Así el usuario puede cambiar una liga seleccionada por otra compatible sin quedar encerrado en un único valor. Mantén la coherencia país → competición → participante → evento. Cuando cambie un padre, conserva solo las selecciones descendientes todavía compatibles y comunica las que se retiraron. No borres filtros independientes sin motivo.

Orden sugerido: territorios y ligas alfabéticamente en español; equipos por nombre; eventos por fecha conocida ascendente, con desconocidos después; desempates por ID estable. Las competiciones internacionales y el territorio desconocido deben tener ramas explícitas.

En la lista de resultados muestra cada evento una sola vez, con referencias a sus participantes. Puede aparecer como referencia en las ramas de ambos equipos, pero el total se calcula con `COUNT(DISTINCT EventIdentity)`.

Cada ficha: logos y nombres de participantes; competición o cartelera; fecha / «Fecha desconocida»; mercado, período y línea; selección y cuota original; casa identificada; fuente y botón de evidencia. No uses únicamente escudos: conserva nombres, texto alternativo y categorías que distingan entidades similares.

Contadores explícitos: eventos, mercados, selecciones, ofertas por casa, observaciones, archivos de evidencia y grupos pendientes. No sumes esos conceptos ni cuentes todas las filas como «partidos». Si un archivo contiene grupos válidos y pendientes, explica el solapamiento.

Al cambiar filtros, limpiar resultados viejos y marcar el estado actual. Cancela peticiones obsoletas cuando sea posible y usa una versión de solicitud para ignorar éxitos y errores tardíos. Un fallo muestra error y resultados vacíos, nunca las fichas de otra selección.

## 8. Algoritmo de logos

```text
Logo(entity) = asset seleccionado del catálogo
               cuyo crosswalk verificado apunta a entity.id y entity.kind
               y cuyo archivo / recurso está disponible

Si no existe: mostrar nombre + marcador neutro de ausencia.
Si hay conflicto: no elegir un escudo; conservar motivo para revisión.
```

Reutiliza `sports_entity_logos` o la salida local equivalente. No busques ni descargues logos, no ejecutes importaciones reales ni llamadas pagadas: el usuario descargará los logos después. Prepara únicamente la integración y su estado sin imágenes. La falta de logo nunca elimina una apuesta válida.

Usa el esquema de importación existente; cuando se añada una biblioteca real, comprueba su formato y las correspondencias antes de mostrar sus imágenes. Para las pruebas, crea únicamente assets de fixture identificados como tales. Un nombre de archivo o una coincidencia aproximada por sí solos no justifican la asignación. El `country` importado debe revisarse semánticamente: por ejemplo, el importador ESPN existente usa `team.location`, que no garantiza ser un país. El país del asset no determina automáticamente el país de la competición.

Sirve únicamente assets aprobados mediante referencias controladas, con caché por hash; no expongas rutas arbitrarias del disco. Evita que un SVG no confiable se inserte como HTML. Carga diferida para las imágenes y un estado estable cuando fallen, sin desplazar el contenido.

## 9. Pseudocódigo de ejecución

```text
organize(request):
  scope = validateSavedScope(request.source, request.captureIds)
  files = readExistingEvidence(scope)
  observations, unparsed = readAndAssess(files, validationVersion)

  for observation in observations:
    resolve identities using provider IDs and reviewed crosswalks
    resolve competition territory independently of source region
    retain every unknown/conflict with its reason and provenance
    build local or verified canonical semantic keys

  matches, unresolved = applyThreeValuedFilters(observations, request.filters)
  facets = deriveFacets(observations, request.filters)
  groups = groupVerifiedEquivalences(matches)
  cards = attachAvailableVerifiedLogos(groups)
  return paginate(cards, unresolved, unparsed, facets, distinctCounts)
```

Versiona el índice con versiones de parser, validación, identidad, catálogo territorial y correspondencias de logos. Invalídalo cuando cambien esas entradas o los archivos fuente. Un cambio de logo puede invalidar solo la proyección visual si no afecta a la identidad. La consulta de organización no debe iniciar navegación deportiva, OCR, IA o ingestión.

La falta de PostgreSQL debe permitir seguir consultando evidencias guardadas con sus identidades locales y metadatos conocidos. Las correspondencias verificadas pueden consultarse desde un snapshot local versionado. No inventes correspondencias para compensar la ausencia de la base de datos.

## 10. Implementación y límites

1. Revisa las piezas enumeradas y confirma los gaps con fixtures locales.
2. Implementa funciones puras para identidades, territorio, claves semánticas y predicados trivalentes.
3. Extiende el índice derivado y el contrato de la API de organización.
4. Conecta el catálogo de logos existente, actualmente vacío, y el fallback de ausencia. Comprueba el enlace con fixtures locales y deja preparado el uso de futuras importaciones verificadas.
5. Integra las facetas y fichas en la sección existente, sin crear nuevas pestañas.
6. Verifica el flujo completo en la app nativa con datos locales.

Conserva página / URL / país de fuente, modo manual / automático, Detener, galería plegable y acceso a todos los originales. Limita las ediciones a esta función y a los adaptadores de metadatos estrictamente necesarios. No cambies landing, Fuentes, Data, scheduler ni Apuesta final. No reescribas RAW ni ejecutes una reparación masiva de la base de datos. Si se necesitan campos nuevos, usa un esquema derivado / auxiliar versionado y una migración aditiva revisable cuando corresponda.

## 11. Pruebas y criterio de terminación

Añade fixtures y comprueba:

- Fuente mexicana + liga inglesa: territorio deportivo Inglaterra, región de fuente México.
- Liga internacional, liga multinacional, territorio desconocido y territorio deportivo distinto de país de acceso.
- Equipos y ligas homónimos; fútbol masculino, femenino, juvenil y reservas separados.
- Un equipo en liga y copa, y cambios de temporada sin membresía permanente inventada.
- Dos encuentros con los mismos rivales en fechas diferentes; dos sin fecha cuya equivalencia no se puede demostrar.
- Eventos con ambas orientaciones de participantes, sin inventar local / visitante.
- Seleccionar un equipo permite ver todos los mercados de sus eventos, no solo su selección ganadora.
- 1X2 frente a ganador de dos opciones; tiempo reglamentario frente a prórroga; distintos períodos y líneas; período desconocido separado de completo.
- `-170`, `+180`, decimales y fraccionales conservan su texto original y no alteran el árbol.
- Varias casas y varias observaciones de una oferta; no se pierden ni mezclan evidencias.
- Evento sin fecha utilizable sin rango de evento, y pendiente al intentar comprobar ese rango.
- Logo correcto por ID; sin logo; archivo roto; candidato ambiguo; colisión entre ID de equipo e ID de competición.
- Filtros sobre la misma observación, facetas que permiten cambiar selección y contadores sin duplicación por equipo o captura.
- Archivos mixtos, texto sin imagen, consultas fallidas, respuestas tardías y PostgreSQL no disponible.
- La regresión BestFightOdds de `tests/bfo-regression.test.ts` sigue pasando y su RAW original permanece idéntico.
- Auto / manual / Detener y galería plegada mantienen su comportamiento.

Ejecuta `npm run typecheck`, las pruebas afectadas, `npm test` y `npm run build`. No declares que se ejecutó una prueba omitida. Documenta la cobertura real de territorios, correspondencias y logos; distingue recursos importados, recursos utilizables y recursos aún faltantes.

La entrega se considera terminada cuando el usuario puede elegir un territorio, una competición y un equipo desde listas reconocibles; ver los eventos y mercados correctos con sus cuotas originales; reconocer las entidades mediante sus nombres y marcadores neutros, con la conexión preparada para los logos que el usuario descargará después; y abrir la evidencia de cada oferta. Los datos que no permitan completar una dimensión siguen accesibles con una explicación, sin aparentar haber cumplido ese filtro.
