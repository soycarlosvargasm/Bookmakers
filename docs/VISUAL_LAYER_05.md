# Capa 5 — ejecución visual (25 septiembre 2026, Asia/Bangkok)

Se aplicó `018_visual_extraction.sql` al proyecto Supabase vinculado **Sportsbook** y se ejecutó `npm run sources:visual` contra las páginas del catálogo. No se usó otra base.

## Action Network

URL: `https://www.actionnetwork.com/nfl/odds`. El selector visible se fijó en **Moneyline**. La captura confirmó el tablero de partidos, dos filas de equipos por evento y ocho columnas nombradas por logos. El extractor exige enlace de evento con ID, etiqueta de cada equipo concordante con su icono, encabezado de la fuente alineado con su columna, dos precios americanos y alineación de cada precio con su selección. La proximidad aislada no basta. El umbral de confianza es 0,90; las asociaciones aceptadas obtuvieron 0,98.

| Métrica | Resultado |
|---|---:|
| Páginas | 1 |
| Regiones con screenshot acotado | 2 |
| Regiones de evento y mercado | 16 / 16 |
| Candidatos de selección | 32 |
| Patrones de precio en celdas visuales | 288 |
| Mercados completos por fuente | 128 |
| Observaciones aceptadas / rechazadas | 256 / 0 |
| Nuevos RAW Visual | 1 |

Los 16 partidos se representan como 128 filas `events` porque el modelo existente conserva una identidad por fuente (8 fuentes). Los 128 mercados Moneyline tienen 2 selecciones cada uno. De los 288 patrones, 32 pertenecen a la columna agregada **BEST ODDS**; se excluyeron antes de crear observaciones porque no identifican una fuente única. Los precios de **OPEN** tampoco se atribuyeron a una fuente. No hubo asociaciones rechazadas entre las ocho columnas nombradas.

Ejemplo verificado directamente en Supabase: `actionnetwork-bet365`, **Falcons vs Packers**, mercado `moneyline`, Falcons `+210` (3,10 decimal) y Packers `-260` (1,38461538 decimal). Ambas selecciones tienen `observedVia=visual-collector` y el identificador de evidencia `d7de749a96c4d206c40d840a`. Una consulta de cruce entre `selections.latest_qualifiers.visualEvidenceKey` y los candidatos del RAW encontró evidencia para **256 de 256** observaciones.

## Esports Insider

URL: `https://esportsinsider.com/betting-odds/r6`. Chromium recibió HTTP 403 y una página de verificación de Cloudflare. Se inspeccionó y guardó una captura acotada y RAW de estado. **VISUAL_BLOCKED**, sin afirmar que los 27 números candidatos de Capa 4 sean cuotas actuales.
Su perfil `visual-inspection-v1` registra la clasificación y los criterios mínimos de asociación; no declara una estructura de mercados estable para una página a la que no se pudo acceder.

| Métrica | Resultado |
|---|---:|
| Páginas / regiones screenshot | 1 / 1 |
| Eventos / mercados / selecciones / cuotas recuperados | 0 / 0 / 0 / 0 |
| Observaciones aceptadas / rechazadas | 0 / 0 |
| Nuevos RAW Visual | 1 |

## Supabase y validación

| Tabla | Antes | Después |
|---|---:|---:|
| `events` | 0 | 128 |
| `markets` | 0 | 128 |
| `selections` | 0 | 256 |
| `odds_observations` | 0 | 256 |
| `raw_payloads` | 17 | 19 |
| `visual_extraction_profiles` | 0 | 2 |

`npm test`: 64 aprobados y 1 omitido. `npm run typecheck`: OK. `npm run build`: OK. Las consultas directas a Supabase confirmaron 16 partidos distintos, 8 fuentes, 128 mercados y 256 observaciones con provenance visual. El RAW visual usa `visual-evidence-v1` y conserva 128 asociaciones completas de Action Network con geometría, razón, confianza y hash de evidencia; no guarda imágenes en Supabase.

## Anomalía independiente pendiente

El handoff informa una recuperación histórica de 1xBet Trotting (10 eventos y 87 observaciones iniciales, con 89 precios posteriores), pero el Supabase Sportsbook vinculado tenía 0 eventos y 0 observaciones antes de Capa 5. No se conoce la causa; no se reconstruyeron esos datos ni se mezclaron con la ejecución visual.
