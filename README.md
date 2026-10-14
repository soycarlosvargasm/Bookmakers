# Personal Sportsbook Collector

Autonomous TypeScript/Node.js collector with a verified Bovada connector. It contains no betting, bet slips, funding, predictions, frontend, or hardcoded credentials.

## Project objective

Build a private sports-market data engine: capture real odds from connected
sources, retain immutable RAW data, normalize it, preserve its history, and
expose reliable comparisons. It is not a betting, prediction, or odds-
generation system.

## Run locally

```sh
npm install
cp .env.example .env
npm run typecheck
npm run build
npm test
npm run migrations
npm start
```

`DATABASE_URL` is optional for the API-only core. When it is set, `npm run migrations` applies pending SQL files transactionally. Docker Compose requires `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` to be supplied in `.env` or the shell environment.

All API routes require `x-api-key: $API_KEY`; the API listens on `127.0.0.1` by default and only returns market/source-health data. Session files are never returned by the API. The implemented routes are `/health`, `/sportsbooks`, `/sportsbooks/:id/status`, `/sports`, `/competitions`, `/events`, `/events/:id`, `/events/:id/markets`, `/events/:id/odds`, `/odds/current`, `/odds/history`, `/changes`, `/source-health`, and the three `/v1/feed/*` routes.

## Visible login

Visible login must run from the host, not inside the Docker container, because it needs a desktop browser window. Set only the provider URL, never credentials, then run:

```sh
ACCOUNT_ALIAS=personal SPORTSBOOK_BETONLINE_LOGIN_URL=https://www.betonline.ag/ npm run cli -- login betonline
ACCOUNT_ALIAS=personal npm run cli -- session-status betonline
ACCOUNT_ALIAS=personal npm run cli -- logout betonline
```

The browser is visible and the command pauses for you to complete normal login, 2FA, or CAPTCHA. No bypass is attempted. For the already-open Edge session, use the CDP flow below; the collector does not create a second login session.

For the already-open Microsoft Edge session described above, the collector must receive an Edge CDP endpoint. It will reject a Chrome endpoint. The current repository does not restart Edge automatically and never opens another browser or profile.

```sh
BETONLINE_CDP_URL=http://127.0.0.1:9223 ACCOUNT_ALIAS=personal npm run betonline:diagnose
```

If Edge was not started with CDP, do not use `open -na`, do not create a new profile, and do not delete lock files. On the detected Edge 153 installation, relaunching the existing default profile with `--remote-debugging-port=9223` is rejected by Edge itself: `DevTools remote debugging requires a non-default data directory`. Therefore this repository will not pretend that Playwright can attach to that profile; it requires a real Edge CDP endpoint and refuses Chrome endpoints.

The existing Edge profile is restored normally at `$HOME/Library/Application Support/Microsoft Edge/Default`. No session data is copied or modified by the collector.

`start`, `stop`, and `health` are also available. BetOnline data collection uses the Edge CDP flow above and does not use Chrome.

After the diagnosis shows usable responses, collect into PostgreSQL:

```sh
BETONLINE_CDP_URL=http://127.0.0.1:9223 ACCOUNT_ALIAS=personal npm run betonline
```

## Continuous polling

The polling engine runs each source and mode independently. It waits until a
cycle finishes before scheduling that source again, so a slow coupon never
overlaps with itself. It records source health before every cycle and keeps
polling the remaining sources if one fails.

```sh
DATABASE_URL="$DATABASE_URL" npm run poll
```

By default this starts Bovada and SX Bet. To include the Action Network
multi-book connector, enable it explicitly and optionally limit the leagues
or book IDs during an initial rollout:

```sh
DATABASE_URL="$DATABASE_URL" POLL_ACTIONNETWORK=true \
  ACTION_LEAGUES=nfl,ncaaf,wnba ACTION_BOOK_IDS=3,13,21,24,68,69,75 npm run poll
```

Intervals are milliseconds: `POLL_LIVE_INTERVAL_MS` defaults to `5000` and
`POLL_EVENTS_INTERVAL_MS` defaults to `15000`. The source-specific runners
are also available as `npm run bovada`, `npm run sxbet`, and
`npm run actionnetwork`.

## Structure

- `src/connectors`: independent connector contract and failure-isolated runner.
- `src/browser`: one reusable Chromium instance with an isolated context per sportsbook/account.
- `src/sessions`: lifecycle state and restrictive private Playwright storage.
- `src/collectors`: raw-first collection flow and append-only observation handling.
- `src/normalization`: common nullable model, odds conversion, dynamic market identity, and deduplication.
- `src/ml`: frozen experimental PostgreSQL-backed datasets, explainable model artifacts, and human-review case collection. ML is not active in production. Train only manually with `npm run ml:train`; inspect `/ml/status`, `/ml/matches`, `/ml/anomalies`, and `/ml/review-cases` with the API key.
- `src/storage`: PostgreSQL pool and raw payload persistence.
- `src/scheduler`: independent timing/RPM configuration per connector.
- `src/health` and `src/api`: health model and local Fastify API.
- `migrations`: PostgreSQL schema for private session metadata and market data as separate concerns.
- `scripts/logos` and `docs/LOGO_PIPELINE.md`: offline sports-logo import, ID reconciliation, deduplication, coverage report and PostgreSQL catalog; bulk image files stay local/object-storage data.

## Sports logo library

The logo pipeline is separate from odds collection. Prepare `data/logos/entities.csv` from the BetFlux entity catalog, put source ZIPs in `data/logos/inbox`, extract, fetch API-Football additions, then build and load the selected-logo catalog. Full source rules, provider CSV format, matching thresholds and refresh steps are in [docs/LOGO_PIPELINE.md](docs/LOGO_PIPELINE.md).

```sh
cp data/logos/entities.example.csv data/logos/entities.csv
python3 scripts/logos/pipeline.py extract
API_FOOTBALL_KEY=... python3 scripts/logos/pipeline.py api-football --seasons 2025,2026
python3 scripts/logos/pipeline.py build
npm run migrations
node scripts/logos/load-db.mjs
```

## Engine update (September 2026)

The collection path is adapter → bounded/redacted RAW → normalization → exact event/market/selection matching → append-only event/price history → deterministic quality and comparison → authenticated API. Existing sportsbook data and source-specific market semantics are retained. SX Bet remains an exchange taker-orderbook snapshot with size and version metadata, not a fixed-odds sportsbook quote. Cross-source comparison matches only exact normalized sport, competition, participants, start time, market, period, player, selection and line; unresolved matches stay separate.

`collector_runs` now has a renewable lease and unique active source lock. Expired runs are marked `FAILED` on polling startup and every 30 seconds. Requests are governed per actual attempt (including retries and health checks), with per-source rate and concurrency limits, `Retry-After`, capped exponential jitter, and source-level overlap protection. `POLL_MAX_REQUESTS_PER_MINUTE` and `POLL_MAX_CONCURRENT_REQUESTS` control budgets.

Current and history odds, events and feed routes accept SQL `limit`/`offset` and `sport`, `competition`, `sportsbook` filters. `/odds/current` and `/odds/comparison` accept `excludeStale=true`; comparison excludes stale by default, includes fixed-odds sources by default, and only includes SX Bet with `includeExchange=true`. `/odds/comparison` exposes current/previous/first observable/high/low per source plus best/worst/mean/median/dispersion and implied-probability movement. `/quality/sources` explains health freshness, stale/missing prices, zero-record runs and collection anomalies. `/sources/capabilities` declares source semantics.

`npm run migrations` applies additive migrations transactionally. The Docker collector entry point does this on each startup and waits for a healthy PostgreSQL service. Never mount migrations into `/docker-entrypoint-initdb.d`, since the migration ledger must remain authoritative. For an isolated backup/restore check with the local Compose PostgreSQL container:

```sh
node scripts/backup-restore.mjs backup /secure/location/collector.dump
node scripts/backup-restore.mjs restore /secure/location/collector.dump collector_verification_restore
```

Restore rejects an existing database and requires a target named `*_restore`; it never overwrites the live database. Use `TEST_DATABASE_URL` pointing to an isolated PostgreSQL database for the integration suite. RAW storage now retains only allowlisted market fields and metadata, discards opaque DOM/WebSocket bodies, caps each capture at 256 KiB, and strips credentials and private URLs. Existing RAW rows are left untouched; do not export them to logs.

The commercial provider review, including product distinctions and licensing questions, is in [RESEARCH_COMMERCIAL_PROVIDERS.md](RESEARCH_COMMERCIAL_PROVIDERS.md).

The supplied sports-source page inventory is versioned in [docs/SOURCE_CATALOG.csv](docs/SOURCE_CATALOG.csv). It is a catalogue, not a claim that every page has a collector or is currently reachable. The latest full extraction audit is in [docs/SOURCE_INGESTION_REPORT.md](docs/SOURCE_INGESTION_REPORT.md).

## Visual collector (Capa 5)

`npm run sources:visual` uses the linked Sportsbook Supabase project and processes the Action Network NFL Moneyline board before the Esports Insider R6 page. It reads visible team labels, named column logos, prices, and document coordinates in Chromium. A quote is accepted only when the event link, two participant rows, selected market, sportsbook header, and both aligned prices agree. Accepted quotes enter the existing normalized tables and price history. The collector stores bounded RAW geometry and a versioned profile in Supabase. Region screenshots stay only in ignored `.audit/visual/`; a later run removes PNGs older than seven days. The collector does not solve site security challenges.

The verified Capa 5 run and the separate historical 1xBet anomaly are recorded in [docs/VISUAL_LAYER_05.md](docs/VISUAL_LAYER_05.md).

ML is frozen as `EXPERIMENTAL / NOT_ACTIVE_IN_PRODUCTION`. The production path is RAW → NORMALIZATION → DETERMINISTIC MATCHING → HISTORY → DATA QUALITY → COMPARISON/API; ML does not accept or reject matches, alter data or odds, generate production anomalies, or affect polling and health. Existing datasets, models, endpoints, versioning and results remain available for inspection. Future difficult cases are collected into `ml_review_cases` and versioned in `ml_review_case_revisions`; no ML prediction is automatically promoted to a label. Re-evaluation requires sufficient human-confirmed real labels, an independent temporal evaluation, and demonstrable improvement over the deterministic baseline.

Action Network live RAW confirmed that `spread_home`/`spread_away` carry handicaps and `spread_home_line`/`spread_away_line` carry American prices. A brief 2026-09-17 validation window used the opposite mapping; migration 008 flags those immutable observations and excludes them from current/comparison while preserving them in history. Subsequent adapter captures use the RAW-verified mapping.
