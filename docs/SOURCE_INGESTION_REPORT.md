# Source ingestion audit

Initial catalogue audit executed on 2026-09-23 against PostgreSQL as
`source_ingestion_runs.id = 6`.  A subsequent recovery pass is documented in
[`BLOCKED_RECOVERY_AUDIT.md`](BLOCKED_RECOVERY_AUDIT.md).

## Catalogue coverage

| Metric | Result |
| --- | ---: |
| Catalogue rows (sport/source relations) | 306 |
| Distinct URLs | 269 |
| Domains | 36 |
| Sports | 88 |
| Attempted URLs | 269 |
| UNTESTED | 0 |
| WORKING | 12 |
| PARTIAL | 0 |
| BLOCKED | 241 |
| BROKEN | 0 |
| NO_CURRENT_MARKETS | 16 |
| INVALID_URL | 0 |

`WORKING` means that the source produced normalized, usable market records and those records passed through `SOURCE -> EVENT -> MARKET -> SELECTION -> LINE -> ODDS -> RAW -> PostgreSQL`. HTTP 200 alone does not qualify.

## Working source pages

| Source page | Adapter | Records | RAW payloads |
| --- | --- | ---: | ---: |
| `https://esportsinsider.com/betting-odds/r6` | EsportsInsider HTML + match pages | 30 | 6 |
| `https://puntersedge.online/best-odds` | `bo-initial` embedded JSON | 882 | 371 |
| `https://racehub.com.au/odds` | Next.js flight/hydration data | 99 | 2 |
| `https://www.actionnetwork.com/mlb/odds` | `__NEXT_DATA__` scoreboard | 1,276 | 158 |
| `https://www.actionnetwork.com/nfl/odds` | `__NEXT_DATA__` scoreboard | 1,464 | 161 |
| `https://www.actionnetwork.com/nhl/odds` | `__NEXT_DATA__` scoreboard | 640 | 101 |
| `https://www.actionnetwork.com/soccer/odds` | `__NEXT_DATA__` scoreboard | 86 | 9 |
| `https://www.actionnetwork.com/ufc/odds` | `__NEXT_DATA__` scoreboard | 48 | 13 |
| `https://www.bestfightodds.com/` | rendered browser DOM | 3,023 | 2 |
| `https://www.marathonbet.com/en/betting/Chess/?menu=true` | Marathonbet HTML fields | 12 | 17 |
| `https://www.marathonbet.com/th/betting/MotoSport/Outright/Moto2/Men%2B-%2B21039296` | Marathonbet HTML fields | 372 | 64 |
| `https://www.muaythai2000.com/en/` | displayed HTML prices | 5 | 6 |

Action Network NBA completed through the same adapter but had zero current rows, so it is `NO_CURRENT_MARKETS`. StrikingOdds' public API also completed with zero current prices. Editorial/promotional pages that exposed no event/market/selection/price structure were audited as `NO_CURRENT_MARKETS`, not left `PARTIAL`.

## PostgreSQL result

The final run added 42 events, 256 markets, 457 selections, 1,830 odds observations, and 1,367 bounded RAW payloads. These are net inserts after canonical deduplication; the working-page record counts above are the records observed during the run.

Every URL has a durable row in `source_urls`, its sport relationships in `source_registry`, exact run evidence in `source_url_attempts`, and latest state in `source_url_health`. Run summaries are stored in `source_ingestion_runs`.

## Blocked evidence

The audit tried normal HTTP first and a real Playwright browser when appropriate. Domain adapters also inspected embedded JSON/state, page hydration, public endpoints, and same-domain routes. Access controls were not bypassed.

The largest blocked groups were:

| Domain | URLs | Recorded blocker |
| --- | ---: | --- |
| `stake.com` | 69 | HTTP fetch failed and browser returned `ERR_CONNECTION_REFUSED` |
| `www.betfair.com` | 29 | HTTP fetch failed and browser returned `ERR_CONNECTION_REFUSED` |
| `www.oddsportal.com` | 25 | HTTP fetch failed and browser returned `ERR_CONNECTION_REFUSED` |
| `www.sportsbet.com.au` | 21 | HTTP fetch failed and browser returned `ERR_CERT_COMMON_NAME_INVALID` |
| `www.oddschecker.com` | 20 | HTTP fetch failed and browser returned `ERR_CONNECTION_REFUSED` |
| `www.betsson.com` | 20 | HTTP/browser access failure recorded per URL |
| `oddspedia.com` | 14 | HTTP/browser access failure recorded per URL |
| `ph.gg.bet` | 10 | HTTP/browser access failure recorded per URL |
| `www.oddshub.io` | 3 | public discovery worked, but `/api/odds/:eventId` explicitly returned HTTP 403 and directed automated clients to the licensed API |

The complete per-URL blocker text, HTTP status, final URL, strategy, timestamp, evidence hash, and browser error remain queryable from `source_url_attempts` for run 6; no blocked page was silently converted into a successful source.

## Verification

- At run 6: TypeScript typecheck and production build passed; 47 of 48 tests passed and the pre-existing PostgreSQL integration test was skipped by its environment guard.
- Final audit invariant: `attempted = 269`, `UNTESTED = 0`, `PARTIAL = 0`.

## Recovery update — runs 7, 8, and 10

The 1xBet trotting catalogue page was recovered through the same brand's
public Kenya page/feed pair rather than by treating the unavailable Iraqi host
as terminal.  The production connector persisted 10 events, 10 markets, 87
selections, 87 observations, and 10 RAW payloads.  Run 8 then re-audited all
269 URLs.  One source with no prices in that later window (EsportsInsider) was
correctly marked `NO_CURRENT_MARKETS`; the global `WORKING` count therefore
remains 12 despite the 1xBet recovery.  Run 10 also corrected Sportsbet's 21
browser HTTP 403 location responses back to `BLOCKED`, rather than accepting
their interstitial HTML as empty markets.  Current URL health is
`WORKING=12`, `NO_CURRENT_MARKETS=17`, `BLOCKED=240`, `PARTIAL=0`, and
`UNTESTED=0`.  See the recovery audit for endpoint provenance, per-domain
causes, and the exact query used to inspect original per-URL evidence.
