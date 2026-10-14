# Catálogo deportivo de evidencias guardadas

Implementado en Progreso y capturas → Ordenar y filtrar. Las listas de país de competición, deporte, liga, participante y evento usan IDs, admiten selección múltiple y búsqueda Unicode. Organización y cartelera aparecen cuando hay datos que las demuestran. Un único deporte no exige selección adicional. Los resultados muestran cada evento una vez y conservan todos sus mercados, selecciones, ofertas e históricos de evidencia. Seleccionar un equipo filtra su participación, incluido empate, totales y selecciones del rival.

## Reglas de lectura

- `sourceRegion`, `competitionTerritory` y país del participante son dimensiones independientes. Región de acceso se resuelve únicamente mediante campo estructurado o coincidencia inequívoca del catálogo de fuentes; nunca determina el territorio deportivo.
- Las correspondencias canónicas requieren revisión y referencias de evidencia. Los IDs externos son cadenas dentro de un namespace de proveedor y tipo. Sin correspondencia, se mantienen IDs de proveedor limitados a esa fuente; sin ID, referencias técnicas del evento o registro. No se heredan los alias automáticos ni la tolerancia temporal del matching existente.
- Un ID de evento deportivo permite conservar cambios de horario. Nombres de rivales y fechas no crean equivalencia entre eventos. Para cruzar fuentes se exige una correspondencia revisada de la edición concreta. Los mercados permanecen en un namespace de proveedor/evidencia; no se fusionan por semejanza de nombre.
- Claves de mercado, selección, oferta y observación usan JSON canónico versionado y SHA-256. Las cuotas y su formato quedan fuera de la identidad. Períodos desconocidos no se transforman en partido completo. Líneas, sujetos, fase y reglas distinguen mercados; variantes de selección distinguen resultados.
- Cada predicado se aplica a la misma observación. OR dentro de una dimensión y AND trivalente entre dimensiones. Un valor conocido que contradice un filtro excluye el registro; uno desconocido lo conserva como pendiente de filtro. `PARTIAL` continúa siendo utilizable sin exigir metadatos ausentes.
- Las facetas excluyen su propio filtro y cuentan eventos distintos. Al aplicar un cambio de padre, la API puede retirar únicamente descendientes incompatibles y devuelve sus nombres. Los filtros independientes se conservan.
- Cada oferta muestra la observación más reciente solo cuando todas sus observaciones permiten demostrar el orden temporal. Empates con precios distintos o fechas de observación ausentes se presentan como incertidumbre. El historial y el acceso a cada original siguen disponibles.
- Las consultas no ejecutan ingestión, navegación, OCR, IA, importación de imágenes ni reparación de la base. La clasificación auxiliar y las proyecciones se invalidan por parser, validación, identidad, snapshot y huellas de archivo. Las proyecciones por archivo y los resultados se reutilizan entre filtros.

## Snapshot auxiliar revisable

Ruta opcional: `.engine/collection/sports-catalog.json`. No se instala una correspondencia inventada por defecto. Esquema `SportsCatalog` en `src/ui/sports-organizer.ts`:

```json
{
  "schema": 1,
  "identityVersion": "review-1",
  "territoryVersion": "territories-1",
  "logoVersion": "logos-1",
  "entries": [],
  "events": [],
  "logoLinks": [],
  "logos": []
}
```

Cada `entries` incluye `entity`, `reviewed: true`, `evidenceRefs` no vacío y, cuando se demuestra, `territory`, `participantCountry`, contexto de competición, categoría y alias exactos. Las entidades verificadas usan IDs tipados como `competition:158` o `team:532`; la tabla numérica de origen no se confunde con otro tipo. Los IDs externos existentes permanecen en `externalIds`; no se renombran en PostgreSQL. Los alias requieren contexto deportivo y territorial/de competición suficiente; múltiples entidades compatibles permanecen ambiguas. Las variantes femenino, juvenil y reservas usan `category` y nombres completos.

Los eventos revisados incluyen proveedor, ID externo, `canonicalId` con prefijo `event:`, edición concreta y referencias. Los metadatos estructurados nuevos de un extractor van en `ProviderRecord.sportsMetadata`, sin modificar RAW históricos. Pinnacle ahora conserva los IDs estructurados de liga y participantes para futuras capturas; BestFightOdds conserva el orden del enfrentamiento sin inventar local/visitante. La vista actual se limita a enfrentamientos y cuotas: futuros y carreras demostrados quedan fuera del listado, con acceso en pendientes a su evidencia original. No se muestran alineaciones, bajas, estadísticas, noticias, minuto del partido, análisis ni pronósticos.

Un equipo puede aparecer en varias competiciones y temporadas: las relaciones se derivan de cada observación y evento, sin membresía permanente dentro del equipo.

## Logos

La biblioteca actual está vacía. `entities.example.csv` es únicamente un ejemplo; la marca de la app tampoco es un escudo deportivo. No se descargaron ni importaron logos.

`logoLinks` une el ID tipado del organizador con el `betflux_entity_id` existente y exige revisión, tipo y evidencia. Con enlaces revisados, se leen únicamente filas seleccionadas de `sports_entity_logos`; `logos` puede contener un snapshot local equivalente para operar sin PostgreSQL. Los campos reutilizados son `betflux_entity_id`, `entity_type`, `sha256`, `canonical_path` y `media_type`. El país del asset no resuelve el país de la competición.

Los paths se resuelven dentro de `data/logos/assets`, con comprobación de ruta real, hash SHA-256, extensión y firma raster. El cliente recibe únicamente `/api/workbench/logos/<hash>`, con caché por hash; no rutas arbitrarias. PNG, JPEG y WebP aprobados se muestran con carga diferida y tamaño fijo. SVG permanece sin mostrar hasta contar con una conversión/revisión segura; nunca se inserta como HTML. Ausencia, conflicto o archivo roto muestran nombre y marcador neutro, sin eliminar mercados. Un snapshot con varias selecciones contradictorias no elige una imagen.

## Cobertura real comprobada el 12 de octubre de 2026

Inventario de lectura, sin alterar originales:

| Recurso | Estado |
|---|---|
| RAW guardados | 755 archivos; 139.209 registros inventariados |
| IDs estructurados de competición reconocidos en históricos | 81 registros |
| Territorios de competición estructurados en históricos | 0 |
| IDs estructurados de participantes reconocidos en históricos | 0 |
| Entidades canónicas existentes en PostgreSQL | 158 competiciones, 532 participantes; su existencia no demuestra revisión |
| Snapshot revisado de identidades/territorios del organizador | Ausente; se utilizan identidades locales |
| Biblioteca de logos | 0 entidades, 0 assets, 0 seleccionados; solo CSV de ejemplo |

La consulta del archivo real conserva 126.104 observaciones utilizables en 162 archivos, organizadas en 10.171 identidades de evento locales/de proveedor, 68.982 mercados, 97.265 selecciones y 99.365 ofertas. No se afirma que estas identidades sean encuentros globales deduplicados. Los metadatos ausentes se conservan como pendientes; 162 archivos contienen grupos utilizables y pendientes. La única rama territorial real disponible hoy es País desconocido / sin resolver. Países y relaciones canónicas aparecerán cuando un extractor aporte campos estructurados o se incorpore un snapshot revisado con evidencia. No se sustituyó ese dato por el país de acceso.

Fixtures aislados comprueban Inglaterra, Escocia, Internacional, Multinacional y país desconocido; cinco entidades canónicas ficticias con referencias explícitas de prueba. Los assets usados para comprobar logos son fixtures PNG, nunca recursos importados del usuario.

## Verificación

- `npm run typecheck`, pruebas afectadas, `npm test` y `npm run build` ejecutados. Resultados detallados en `.audit/sports-organizer-affected.log` y `.audit/sports-organizer-full-tests.log`.
- Suite completa: 197 casos, 195 pasan y 2 omitidos por configuración: integración PostgreSQL y recuperación de ingestión con base aislada. Esas dos pruebas no se declaran ejecutadas.
- BestFightOdds: la regresión y comprobación de RAW byte a byte pasan. Manual, automático, Detener, selección de página/URL/país y galería plegable conservan sus regresiones.
- App nativa de revisión, puerto 3447, con archivos temporales locales: selección Inglaterra → Liga inglesa de prueba → Águilas Football Club; un evento, tres mercados, cuatro selecciones, cinco ofertas y seis observaciones. Se verificaron +180/+190, -170, 2.80, 2.85 y 9/5; nombres y ausencia de logo; se abrió una evidencia de texto original y sus registros.
- Integridad del archivo real: se comprobaron hashes SHA-256 de los 755 RAW; 0 cambios. Primera proyección completa del archivo: 20,4 segundos; consulta posterior con otro filtro: 3,8 segundos, en esta máquina y con este inventario.
- Los tests nuevos cubren filtros trivalentes, facetas intercambiables, descenso compatible, horarios cambiantes/conflictivos, futuros, homónimos y categorías, ausencia de PostgreSQL, snapshots ausentes o corruptos, logos por ID tipado, rotos/ambiguos, hashes, symlinks y rutas externas, y respuestas tardías/fallidas.

No se cambiaron Data, Fuentes, landing, scheduler ni Apuesta final. La carpeta no es un repositorio Git; los cambios están guardados en los archivos del proyecto, con copia de los originales editados en `.audit/sports-organizer-before/`.
