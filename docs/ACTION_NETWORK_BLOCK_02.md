# Action Network — block 02 report

Inspection date: 2026-09-22. The URLs below are the exact catalogue URLs.
All returned HTTP 200 without login in this runtime and exposed JSON embedded
in the public HTML `__NEXT_DATA__` script. No internal endpoint was
constructed or assumed.

| Sport / URL | Status | Prematch real capture | Live capture |
| --- | --- | --- | --- |
| NBA — `https://www.actionnetwork.com/nba/odds` | SEASONAL | 0 events, markets or odds | 0 events, markets or odds |
| MLB — `https://www.actionnetwork.com/mlb/odds` | PARTIAL | 3 events, 143 book-scoped markets, 285 odds, 28 RAW payloads | 0 events / odds |
| NHL — `https://www.actionnetwork.com/nhl/odds` | PARTIAL | 8 events, 354 book-scoped markets, 708 odds, 79 RAW payloads | 0 events / odds |
| NFL — `https://www.actionnetwork.com/nfl/odds` | PARTIAL | 1 event, 48 book-scoped markets, 96 odds, 10 RAW payloads | 0 events / odds |
| UFC — `https://www.actionnetwork.com/ufc/odds` | PARTIAL | 4 events, 12 book-scoped markets, 24 odds, 12 RAW payloads | 0 events / odds |

## Observed data model

NBA/MLB/NHL/NFL use `scoreboardResponse.games`; UFC uses the separately
observed `scoreboardResponse.competitions` form. Both contain event IDs,
market IDs, outcome IDs, source start/status values, book IDs, raw American
odds, market type, side, period, line value, and line status. UFC additionally
provides `competitors` and `player_id`; selections are normalized to the
fighter names rather than the source's non-semantic `noside` value.

The collector keeps original market/selection/status/line data in qualifiers
and stores a bounded RAW payload per event/book. Decimal odds are normalized
from, but never replace, raw American odds. Live state uses source status only.

## Implementation and verification

- `src/connectors/actionnetwork/embedded-odds.ts` now accepts both observed
  source shapes.
- `src/run-actionnetwork-pages.ts` runs this exact URL group with
  `npm run actionnetwork:pages`; with `DATABASE_URL`, it persists each capture
  via the append-only collector pipeline.
- `tests/connectors-quality.test.ts` covers both game and UFC competition
  payloads, IDs, names, odds, lines and RAW retention.

`npm run typecheck`, `npm run build`, and `npm test` passed. The test suite has
one PostgreSQL integration test skipped because no isolated test database is
configured. No live event existed during this capture, and no real PostgreSQL
write was run because `DATABASE_URL` is absent, so captured sources remain
PARTIAL rather than WORKING.

Two consecutive real prematch captures were stable: MLB 3 events/285 odds,
NHL 8/708, NFL 1/96, and UFC 4/24. Every emitted RAW payload passed the
allowlist without omission and retained `outcome_id`; the largest sanitized
payloads were 4,609, 3,759, 2,628, and 947 bytes respectively. The browser
automation command was unavailable in this environment, so this verification
used direct, read-only requests to the supplied pages.
