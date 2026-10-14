# Fuentes gratuitas de mercado deportivo en tiempo real

## Conclusión

No hay una fuente líder que sea simultáneamente gratuita, en tiempo real, multi-casa y autorizada para revender cuotas de sportsbooks. La limitación decisiva no es técnica: las webs de las casas suelen prohibir la extracción automatizada y el uso comercial de sus datos. Un WebSocket visible, una API interna o un `robots.txt` permisivo no conceden una licencia de redistribución.

La ruta viable sin pagar a un agregador es construir software multifuente y admitir únicamente fuentes con derechos verificables. En el corto plazo, los exchanges y prediction markets ofrecen datos live técnicamente gratuitos, pero son una clase de precio distinta de una cuota de sportsbook y su permiso comercial debe verificarse por fuente.

## Matriz de decisión

| Fuente | Acceso técnico | Tiempo real | Clase de dato | Estado para producto comercial |
| --- | --- | --- | --- | --- |
| SX Bet | REST de lectura público; WebSocket con API key | Sí | Exchange deportivo | Pendiente: blog favorable, términos restrictivos |
| Polymarket | REST y WebSocket de mercado públicos | Sí | Prediction-market CLOB | Pendiente de autorización escrita |
| Kalshi | REST público; WebSocket autenticado | Sí | Prediction market | Bloqueado para reventa por su acuerdo |
| Betfair Exchange | API/stream oficiales | Sí, con licencia | Exchange | Requiere licencia comercial para publicar |
| BetOnline / Bovada / Bet365 / DraftKings | UI y, a veces, tráfico observable | A menudo | Sportsbook | No aprobar para producto comercial sin permiso |
| The Odds API | API agregada | Sí | Agregador de sportsbooks | Permite apps, no revender un feed; free tier no sostiene producción |

## Hallazgos por fuente

### SX Bet: candidato técnico, no aprobación comercial todavía

SX documenta lecturas REST gratuitas y requiere API key para el WebSocket en tiempo real. Su blog de desarrolladores declara que no hay una barrera comercial para construir con la API. Sin embargo, los términos generales publicados conceden una licencia personal, no comercial y no sublicenciable; además restringen publicar, transferir o combinar su contenido/odds. La contradicción se debe resolver contractualmente antes de exhibir, almacenar para clientes, agregar o revender precios.

Uso permitido por esta investigación: POC interno y conector aislado de `exchange`. No etiquetar como licencia comercial ni como cuota de BetOnline/Bovada. Solicitar por escrito un addendum que cubra SaaS/display, caché, retención, agregación, derivados, sublicencia, territorios, atribución y SLA.

Fuentes: [API](https://docs.sx.bet/api-reference/introduction), [Help API](https://help.sx.bet/en/articles/12984899-api), [blog de desarrolladores](https://blog.sx.bet/developers/tutorials/cluster/building-on-sx-bet/), [términos](https://help.sx.bet/en/articles/3613372-terms-and-conditions).

### Polymarket: feed público, clase distinta y permiso pendiente

Polymarket publica market data REST sin API key, autenticación ni wallet. El stream de mercado expone snapshot de libro, cambios de precio, trades y ciclo de vida. Es una fuente muy adecuada para probar una tubería live `snapshot → delta → RAW → estado`, pero sus precios son contratos YES/NO de un libro de órdenes, no una cuota de sportsbook. La correspondencia sólo es válida cuando evento, línea, ventana y regla de resolución coinciden exactamente.

La documentación técnica no concede una licencia de redistribución comercial. Tratarla como fuente experimental interna hasta contar con autorización escrita aplicable a la jurisdicción y producto objetivo.

Fuentes: [market data](https://docs.polymarket.com/market-data/overview), [WebSocket](https://docs.polymarket.com/api-reference/wss/market), [límites](https://docs.polymarket.com/api-reference/rate-limits), [acuerdo presentado para Polymarket US](https://www.cftc.gov/sites/default/files/filings/orgrules/25/08/rules08122528299.pdf).

### Kalshi: API pública no equivale a derecho de producto

Kalshi permite consultar mercados y orderbooks por REST sin autenticación; el WebSocket live requiere API key y firma. Su acuerdo de desarrollador limita el uso al trading propio y restringe almacenar, agregar o compartir datos con terceros. No es una fuente admisible para redistribuir sin un permiso contractual específico.

Fuentes: [REST](https://docs.kalshi.com/getting_started/quick_start_market_data), [WebSocket](https://docs.kalshi.com/getting_started/quick_start_websockets), [Developer Agreement](https://kalshi-public-docs.s3.amazonaws.com/Kalshi-Developer-Agreement.pdf).

### Sportsbooks visibles: técnicamente observables, no admitidos por defecto

Las casas suelen actualizar UI mediante HTTP, SSE o WebSockets; eso explica por qué un colector puede ver datos live. Pero Bet365 prohíbe expresamente automatizar la copia/extracción de odds y el uso comercial de esos datos. DraftKings prohíbe bots y screen scrapers, y limita datos de sportsbook a uso privado/no comercial. Betfair exige licencia comercial para publicar sus precios. Estas restricciones descartan usar la web o tráfico interno de una casa como fuente comercial sin autorización, incluso si la cuenta está autenticada.

Fuentes: [Bet365](https://help.bet365.com/s/en-gb/terms-and-conditions), [DraftKings](https://sportsbook.draftkings.com/legal/in-terms-of-use), [Betfair licensing](https://support.developer.betfair.com/hc/en-us/articles/360002464152-Which-API-Licence-Do-I-Require), [Bovada terms](https://www.bovada.lv/contents/terms_of_service_bvd.pdf).

## Arquitectura recomendada

Cada conector debe declarar, y el scheduler debe hacer cumplir:

```ts
type SourceAdmission = {
  accessMode: "direct_public_api" | "passive_authorized_browser";
  sourceKind: "sportsbook_offer" | "exchange" | "prediction_exchange";
  commercialReuse: "approved" | "pending" | "blocked";
  termsUrl: string;
  approvalEvidence?: string;
};
```

- `approved`: puede llegar a la API pública.
- `pending`: sólo laboratorio interno; no exponer RAW ni cuotas a clientes.
- `blocked`: no iniciar navegador, login ni tarea de captura.

Para streams autorizados: descubrir mercado y token, guardar snapshot RAW, aplicar sólo deltas vinculados al snapshot, y ejecutar `RESYNC_REQUIRED` al perder continuidad. Conservar dirección, timestamp, hash, tópico, request ID, codec y versión de parser. Nunca inferir campos de frames binarios sin un esquema documentado.

## Prioridad de ejecución

1. Implementar el registro `SourceAdmission` y bloquear fuentes sin derechos aprobados de publicación.
2. Añadir un conector experimental de SX Bet o Polymarket como `exchange`/`prediction_exchange`, sin mezclar su precio con cuotas de sportsbook.
3. Exponer bid, ask, profundidad, liquidez, timestamp y regla de resolución; no sólo una falsa “decimal odd”.
4. Preparar una solicitud de autorización de datos para SX Bet/Polymarket. Sólo pasar a producción tras respuesta escrita.
5. Posicionar el producto como software de analítica y conectores autorizados/BYO-source, no como reventa de un feed de casas sin licencia.

## Fuentes técnicas de arquitectura

- [Chrome DevTools Protocol: Network](https://chromedevtools.github.io/devtools-protocol/tot/Network/)
- [RFC 6455: WebSocket](https://www.rfc-editor.org/info/rfc6455/)
- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [MDN: MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Diffusion binary topics](https://docs.diffusiondata.com/docs/latest/manual/html/designguide/data/topics/binary_topics.html)
