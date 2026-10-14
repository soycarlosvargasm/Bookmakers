# Blocked-source recovery audit

Recovery pass completed on 2026-09-23.  This is a recovery audit, not a URL
availability report: a source only changes to `WORKING` after it writes real
`EVENT -> MARKET -> SELECTION -> ODDS` records and its original payload to
PostgreSQL.

## Result

| Metric | Before (run 6) | After (run 10) |
| --- | ---: | ---: |
| WORKING URLs | 12 | 12 |
| NO_CURRENT_MARKETS URLs | 16 | 17 |
| BLOCKED URLs | 241 | 240 |
| PARTIAL / UNTESTED URLs | 0 / 0 | 0 / 0 |

`source_ingestion_runs.id = 7` is the one-source recovery run.  Its only
attempt succeeded and is durable in `source_url_attempts` and
`source_url_health`.  The full re-audit (`id = 8`) attempted all 269 URLs.  A
Sportsbet-only corrective run (`id = 10`) correctly reclassified 21 browser
HTTP 403 responses as `BLOCKED`; they are not treated as empty markets.

The displayed `WORKING` total is still 12 because EsportsInsider had no current
prices during run 8 and correctly moved from `WORKING` to
`NO_CURRENT_MARKETS`; 1xBet itself moved from `BLOCKED` to `WORKING`.

## Recovered: 1xBet trotting

The catalogue URL `https://irq.1xbet.com/en/line/trotting` could not be
reached from this network.  The same 1xBet public product is available at the
official Kenya regional host.  Its rendered trotting page exposes race links;
the normal page requests the public JSON endpoints below without a login or an
access-control bypass:

```text
https://1xbet.co.ke/en/line/trotting
/service-api/main-line-feed/v3/gameInfo?...&gameId={id}&gr=656&lng=en&ref=61
/service-api/main-line-feed/v3/gameEvents?...&gameId={id}&gr=656&lng=en&marketType=1&ref=61
```

The adapter is `src/connectors/onexbet/connector.ts`.  It retains 1xBet event,
group, market, and runner identifiers; writes each event JSON as a bounded RAW
payload; and normalizes decimal `cf` prices without assigning market semantics
that the payload does not supply.  It only accepts the explicit public
`1xbet.co.ke/en/line/trotting/` provenance in the RAW policy.

The recovery run persisted **10 events, 10 markets, 87 selections, 87 odds
observations, and 10 RAW payloads**.  The full re-audit then obtained 89 fresh
1xBet selection-price observations.  Example live source data was Australia,
Hobart / Race 4, selection `№6 My Beautiful Life`, decimal price `1.75`, event
ID `372339968`; this is not generated data.

## Remaining blocked domains

The URL counts below are distinct catalogue URLs; the associated relationship
counts may be larger because a URL can serve several sports.  The full
per-URL, timestamped outcome for all original attempts is stored in
`source_url_attempts` under run 6.  This pass rechecked the domain-level
alternative/transport path before retaining each group as blocked.  No TLS,
CAPTCHA, account, or licensed-API control was bypassed.

| Domain | URLs / relations | Recovery path investigated | Reproducible result / current cause |
| --- | ---: | --- | --- |
| `stake.com` | 69 / 76 | Normal HTTP(S), Playwright, `stake.us`, `stake.bet`, public data documentation | Catalogue host and browser: `ERR_CONNECTION_REFUSED`; US/BZ public sites: Cloudflare 403. Official data API requires an API key. |
| `www.betfair.com` | 29 / 32 | Normal HTTP(S), Playwright, global exchange routes, `betfair.es` | Global host refused. Spain exchange shell rendered normally but showed no events/market rows and no priced feed for this locale; no session/API credential was available. |
| `www.betsson.com` | 20 / 28 | Normal HTTP(S), Playwright, same-provider Kambi offering routes | Host unavailable; Kambi offering endpoint returned HTTP 429 `No access`. No retry/bypass of the restriction. |
| `www.oddsportal.com` | 25 / 26 | Normal HTTP(S), Playwright, `next.oddsportal.com` | Both old and next hosts refused before an HTML or JSON response. |
| `www.sportsbet.com.au` | 21 / 22 | Normal HTTP(S), Playwright, current public routes | Normal browser session returns HTTP 403 `Sportsbet Location Error`; HTTP/80 also returned a third-party `Caution` page, not Sportsbet content. Neither was accepted as source data. |
| `www.oddschecker.com` | 20 / 20 | Normal HTTP(S), Playwright, public route/API discovery | Host refused; no documented public odds API was available without a commercial arrangement. |
| `oddspedia.com` | 14 / 14 | Normal HTTP(S), Playwright, widgets/API route | Host refused. The public widget offering requires account registration/API credentials, none configured. |
| `ph.gg.bet` | 10 / 10 | Normal HTTP(S), Playwright, same-domain public routes | Connection refused before page or feed discovery. |
| `www.betonline.ag` | 6 / 10 | Normal HTTP(S), Playwright, official alternate hosts and existing session check | TLS name validation failed. No authorised Edge/CDP session was configured; no certificate bypass was used. |
| `www.betus.com.pa` | 5 / 9 | Normal HTTP(S), redirect chain, official root | Official root redirected to `.com.pa`; destination then refused. No market feed obtained. |
| `sport.netbet.com` | 3 / 3 | Normal HTTP(S), Playwright, regional public route | Access control/transport failure; UK alternate returned its error page, not events or prices. |
| `sportsbet.io` | 3 / 4 | Normal HTTP(S), Playwright, same-domain root | Connection refused before content/feed discovery. |
| `www.ladbrokes.com` | 3 / 3 | Normal HTTP(S), Playwright, regional public route | TLS name validation failed; no insecure certificate override used. |
| `www.oddshub.io` | 3 / 3 | Public `/api/leagues`, `/api/events`, `/api/odds/:eventId` | Event discovery worked, but the odds endpoint explicitly replied HTTP 403 and directed clients to licensed API access. |
| `www.pinnacle.com` | 3 / 3 | Normal HTTP(S), Playwright, `.ca` / `.bet` alternatives | Catalogue host refused. Regional shells had no public market rows; live centre requires sign-in. No credentials/API account. |
| `99bet.now` | 1 / 1 | Normal HTTP(S), Playwright, same-domain root | Connection refused before content/feed discovery. |
| `next.oddsportal.com` | 1 / 1 | Normal HTTP(S), Playwright, canonical OddsPortal host | Both canonical/next hosts refused before response. |
| `sportsbook.draftkings.com` | 1 / 1 | Normal HTTP(S), Playwright, current sportsbook route | TLS name validation failed; HTTP/80 `Caution` was not DraftKings data. |
| `www.betsafe.com` | 1 / 1 | Normal HTTP(S), Playwright, same-provider Kambi offering route | Host unavailable; the public Kambi offering request returned HTTP 429 `No access`. |
| `www.sportsbook.com` | 1 / 3 | Normal HTTP(S), Playwright, current sportsbook route | TLS name validation failed; HTTP/80 `Caution` was not sportsbook data. |
| `www.xbet.ag` | 1 / 1 | Normal HTTP(S), Playwright, same-domain root | Connection refused before content/feed discovery. |

## Evidence and verification

Run 6 contains the original individual HTTP/browser result for all 269
catalogue URLs; run 8 contains the complete re-audit.  To inspect the remaining
blocked URLs without exposing any secrets:

```sql
SELECT su.domain, su.url, a.strategy, a.http_status, a.failure_reason,
       a.evidence, a.finished_at
FROM source_url_attempts a
JOIN source_urls su ON su.id = a.source_url_id
WHERE a.run_id IN (6, 8, 10) AND a.runtime_status = 'BLOCKED'
ORDER BY su.domain, su.url;
```

The recovery transport itself is covered by `tests/onexbet.test.ts`; the
connector was executed through the production `CollectorService`, not a test
fixture.  The ingestion classifier also has a regression test for network
interstitial pages and browser-side 403 results are classified as blocked before
HTML analysis.  `npm run typecheck`, `npm test`, and `npm run build` pass after
the adapter was added.  The test suite has 50 tests: 49 pass and the
pre-existing PostgreSQL integration test is skipped by its environment guard.
