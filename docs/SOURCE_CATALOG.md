# Source catalogue

Canonical project inventory of the sports-source pages supplied to the project.

- The machine-readable catalogue is [SOURCE_CATALOG.csv](SOURCE_CATALOG.csv).
- One row represents one sport-to-source page, not an implemented collector.
- `catalog_status` is the supplied catalogue label (`ACTIVA`, `CANDIDATA`, or `BLOQUEADA`). It is not a runtime health check, permission grant, or assertion that the URL can currently be collected.
- An aggregator remains one source adapter even if it displays quotes from many bookmakers.
- Implementation, scheduler enablement, current health, and PostgreSQL persistence must be audited separately from this catalogue.

Imported from the user-provided source inventory on 2026-09-22: 306 sport/source-page rows and 269 distinct URLs.

Runtime ingestion is executed with `npm run sources:registry`. The runner synchronizes this file into PostgreSQL, attempts every unique URL, stores one of `WORKING`, `PARTIAL`, `BLOCKED`, `BROKEN`, `NO_CURRENT_MARKETS`, or `INVALID_URL`, and fails the run unless the untested count is zero.

The latest complete runtime result is documented in [SOURCE_INGESTION_REPORT.md](SOURCE_INGESTION_REPORT.md). PostgreSQL run 6 attempted all 269 URLs with `UNTESTED=0` and `PARTIAL=0`.
