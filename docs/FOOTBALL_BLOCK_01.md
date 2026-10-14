# Football — block 01 inspection and connector report

Inspection date: 2026-09-21. This report records only behavior observed from
this runtime. A connection failure here is not evidence that a source has
ceased to operate elsewhere.

## Sources received

| Source | URL | Status in this runtime | Observed transport | Evidence |
| --- | --- | --- | --- | --- |
| Oddspedia | `https://oddspedia.com/football/odds` | BLOCKED | UNKNOWN | TCP connection to port 443 timed out before an HTTP response. |
| Action Network | `https://www.actionnetwork.com/soccer/odds` | PARTIAL | JSON embedded in HTML | HTTP 200; public page contained `__NEXT_DATA__` with `scoreboardResponse.games`. |
| Sportsbet | `https://www.sportsbet.com.au/betting/soccer` | BLOCKED | UNKNOWN | TLS validation failed: the presented certificate did not name `www.sportsbet.com.au`. No insecure bypass was used. |
| Betfair Exchange | `https://www.betfair.com/exchange/plus/en/soccer-betting-1` | BLOCKED | UNKNOWN | TCP connection to port 443 timed out before an HTTP response. |
| Oddschecker | `https://www.oddschecker.com/football` | BLOCKED | UNKNOWN | TCP connection to port 443 timed out before an HTTP response. |

No login, geo restriction, WAF, CAPTCHA, pagination, rate limit, WebSocket,
SSE, XHR, or fetch transport was inferred for any blocked source.

## Action Network

SOURCE: Action Network  
SPORT: soccer (the source's `pageProps.league` value)  
URL: `https://www.actionnetwork.com/soccer/odds`

STATUS: PARTIAL. The connector itself is working with current public data.
The status remains PARTIAL for this execution because `DATABASE_URL` was not
configured, so no PostgreSQL RAW/history write could be performed here.

METHOD: GET the supplied public page and parse only its observed
`<script id="__NEXT_DATA__" type="application/json">` payload. No internal
endpoint or parameter is constructed.

DATA TRANSPORT: JSON embedded in HTML.

The observed payload includes source event IDs (`game.id`), source market IDs
(`market_id`), source selection IDs (`outcome_id`), source start times,
`status`/`real_status`, sport and competition labels, team IDs/names, raw
American odds, market `type`, selection `side`, `period`, `value`, `is_live`,
and `line_status`. Market/selection labels are retained in qualifiers as
`rawMarketName` and `rawSelectionName`; the original event status and line are
also retained. Decimal odds are derived by the common normalizer while raw
American odds remain unchanged.

The live classification relies on observed `status`/`real_status` values only;
it does not infer live play from the start time. The connector emits a separate
bounded RAW payload for each source event/book group. This keeps captures under
the 256 KiB RAW policy while retaining the source IDs and market fields.

### Real capture

Two consecutive captures of the public page produced the same current shape:

| Metric | First capture | Second capture |
| --- | ---: | ---: |
| Prematch events | 1 | 1 |
| Source event ID | `292385` | — |
| Book-scoped source markets | 34 | 34 |
| Odds observations | 75 | 75 |
| RAW event/book payloads | 7 | 7 |
| Live events / observations | 0 / 0 | not re-run separately |

All seven real RAW payloads passed the allowlist policy without omission; the
largest sanitized payload was 2,818 bytes and retained `outcome_id` and
`rawMarketName` fields.

### Files

- `src/connectors/actionnetwork/embedded-odds.ts` — public embedded-JSON connector.
- `src/run-actionnetwork-soccer.ts` — real inspection runner: `npm run actionnetwork:soccer`.
  When `DATABASE_URL` is configured, the same command uses `CollectorService`
  and `PostgresStorage` to persist prematch/live captures append-only.
- `src/collectors/raw-policy.ts` — permits this exact public Action Network
  odds-page pattern and retains observed market fields/ID-keyed book maps.
- `tests/connectors-quality.test.ts` — IDs, RAW preservation, market,
  selection, odds and line test.

### Verification

- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm test` — 35 passed, 1 PostgreSQL integration test skipped because no
  isolated test database was configured.
- `npm run actionnetwork:soccer` — passed with the real capture above.

### Known limitations

- Persistent RAW/history writes have not been run here because no
  `DATABASE_URL` was supplied. Set it and run `npm run actionnetwork:soccer`
  to use the connector's append-only `CollectorService`/`PostgresStorage` path.
- The source had no live football event at this capture. Live parsing is
  implemented against the source's observed status fields but has not yet
  been proven with a live payload.
- The browser-automation command advertised by the environment was absent,
  and no browser surface was available. Inspection therefore used direct,
  read-only requests to the supplied URLs.
