# BetFlux sports logo pipeline

This is a batch media pipeline, independent of the live odds collector. Keep downloaded source packs in a local, ignored directory; commit the small entity crosswalk and migration, not tens of thousands of binaries.

## Data model

- `sports_logo_entities`: one stable BetFlux identity per club, national team, league, cup, federation or sport; holds aliases and provider IDs.
- `sports_logo_assets`: one row per exact SHA-256 file, with canonical source path and every duplicate path.
- `sports_logo_candidates`: all plausible entity-to-file matches, confidence, quality, source priority and decision evidence; exactly one selected row per entity.
- `sports_entity_logos`: read view for the selected logo to join from the BetFlux API by `betflux_entity_id`.

The IDs from the BetFlux event/competition model are the join key. Do not use a team name as a production foreign key. Provider IDs remain namespaced (`api_football`, `espn`, `thesportsdb`, `wikidata`, `football_manager`) because IDs collide between providers.

## 1. Prepare the entity crosswalk

Copy `data/logos/entities.example.csv` to `data/logos/entities.csv`. Populate one row for every BetFlux club, national side, league, tournament and federation. Required columns: `betflux_id,entity_type,sport,name`. Optional columns:

```text
country,competition,aliases,api_football_id,api_football_league_id,
espn_id,thesportsdb_id,wikidata_id,fm_id
```

Use `|` between aliases. Make `betflux_id` the exact stable identifier used by the BetFlux app/database. `entity_type` is one of `team,club,national_team,league,tournament,federation,sport`. `fm_id` is important for TCM: its `config.xml` files map image paths to Football Manager IDs, so the CSV needs a `fm_id` crosswalk to BetFlux IDs. The importer reads those config files automatically. Never infer FM IDs from filenames.

If BetFlux canonical participants and competitions already exist, export their IDs and aliases into this file. A starting point for the current PostgreSQL schema is:

```sql
SELECT cp.id::text AS betflux_id, 'team' AS entity_type, cp.sport_key AS sport,
       cp.display_name AS name, string_agg(DISTINCT pa.alias_name, '|') AS aliases
FROM canonical_participants cp
LEFT JOIN participant_aliases pa ON pa.canonical_participant_id = cp.id
GROUP BY cp.id, cp.sport_key, cp.display_name;

SELECT cc.id::text AS betflux_id, 'league' AS entity_type, cc.sport_key AS sport,
       cc.display_name AS name, string_agg(DISTINCT ca.alias_name, '|') AS aliases
FROM canonical_competitions cc
LEFT JOIN competition_aliases ca ON ca.canonical_competition_id = cc.id
GROUP BY cc.id, cc.sport_key, cc.display_name;
```

These export only identities already known to the canonical tables. Merge in the full BetFlux catalog and assign the proper `entity_type` where competitions include cups/tournaments.

## 2. Put source files in the inbox and extract

Download the official TCM26 megapack and updates from the TCM download page. Keep the `config.xml` files and directory structure intact. Put ZIPs under `data/logos/inbox/`; name them to identify their source, for example `tcm26-megapack.zip` and `tcm26-update-1.zip`. Do the same for downloaded football-logos.cc packs and GitHub archives.

```sh
mkdir -p data/logos/inbox
# move the downloaded ZIPs into data/logos/inbox/ (do not flatten the TCM pack)
python3 scripts/logos/pipeline.py extract
```

Each ZIP gets its own directory in `data/logos/assets/`. Extraction rejects absolute and `..` paths. Re-running is idempotent and overwrites matching paths.

## 3. Fetch API-Football additions

Set `API_FOOTBALL_KEY` in your shell and fetch all available teams by country, plus league badges for one or more seasons. Team rows are linked by the provider ID in `api_football_id`; league rows use `api_football_league_id`.

```sh
export API_FOOTBALL_KEY='...'
python3 scripts/logos/pipeline.py api-football --seasons 2025,2026
```

The script saves files to `assets/api-football/` and a normalized `data/logos/api-football.csv`. Provider assets are skipped if already present locally.

For ESPN, pass league slugs to enumerate (examples: `football/nfl`, `baseball/mlb`, `basketball/nba`, `basketball/wnba`, `hockey/nhl`, `soccer/eng.1`). ESPN does not expose one dependable global sports/league directory, so keep the league slugs you want in a versioned list. The importer reads each teams feed and picks the highest-size logo returned.

```sh
python3 scripts/logos/pipeline.py espn \
  --leagues football/nfl,football/college-football,baseball/mlb,basketball/nba,basketball/wnba,hockey/nhl,soccer/eng.1,soccer/usa.1
```

TheSportsDB enumerates the leagues and teams visible to the supplied key and downloads `strBadge` images:

```sh
THESPORTSDB_API_KEY='YOUR_KEY' python3 scripts/logos/pipeline.py thesportsdb
```

The free TheSportsDB key has small result limits; use a key/plan that returns the full league catalog for a full sweep. Wikidata is queried/exported through SPARQL and fed through the common CSV downloader below.

## 4. Add any secondary provider using one CSV shape

For sources without a dedicated enumerator (for example Wikidata SPARQL export), create a provider CSV with columns:

```text
provider,provider_id,entity_type,sport,name,country,competition,url,aliases
```

Examples: `provider=espn` with `provider_id=team.id` and its logo URL; `provider=thesportsdb` with `provider_id=idTeam`, name and `strBadge`; `provider=wikidata` with QID and `P154` URL. ESPN feeds commonly expose `team.logos[].href` / `team.logo`; TheSportsDB exposes `strBadge`; for Wikidata, export `?item ?itemLabel ?logo` and preserve the QID. Use lower-case provider names as shown so IDs link to columns in `entities.csv`.

```sh
python3 scripts/logos/pipeline.py download-catalog \
  --input data/logos/wikidata.csv --output data/logos/wikidata-downloaded.csv
```

Pass all generated catalogs to the builder so numeric-file assets resolve by provider ID before name matching:

```sh
python3 scripts/logos/pipeline.py build \
  --provider-catalog data/logos/api-football.csv \
  --provider-catalog data/logos/espn-downloaded.csv \
  --provider-catalog data/logos/thesportsdb-downloaded.csv \
  --provider-catalog data/logos/wikidata-downloaded.csv
```

For `football-logos.cc` and JoseArroyave, extract the ZIPs without renaming folders. The builder matches folder/filename labels to `name` and `aliases`. JoseArroyave's paths are country/team SVGs; football-logos.cc packs include searchable team filenames and league folders.

## Matching, deduplication, and logo choice

1. **Identity before fuzzy names:** exact provider ID in the entity crosswalk; for TCM, `config.xml` FM ID plus `fm_id`; then exact normalized display name/alias in path components.
2. **Normalization:** casefold, remove accents and punctuation, standardize separators, and remove generic tokens (`FC`, `club`, `logo`, `badge`, resolutions and common 8+ character asset hashes).
3. **Fuzzy fallback:** only search same-country or same-competition candidates where those folders are available; otherwise use a first-token index. Similarity below `0.82` is not assigned. If the top two different entities are within `0.08`, the file goes to review instead of assigning to either team.
4. **Exact duplicate files:** SHA-256 makes byte-identical copies one asset row. All original paths remain recorded in `assets.csv`/database for traceability. `duplicates.csv` lists duplicate paths; source ZIP contents are left intact. This avoids deleting evidence or corrupting source packs.
5. **Best variant:** among auto-matches, rank by confidence first, then source order (`TCM26 > football-logos.cc > JoseArroyave > API-Football > ESPN > TheSportsDB/Wikidata`), then raster resolution and alpha support, with SVG preferred for vector use. All alternates remain in `candidates.csv`; `selected.csv` is the single winner.
6. **No confident logo:** entities without a selected candidate appear in `missing.csv`. Download/refetch from a secondary source or add a reviewed alias/provider ID, then rerun. Never fabricate a logo or let a low-confidence fuzzy match silently win.

The standard library importer hashes and ranks files without requiring an imaging dependency. If you need robust visual near-duplicate detection across differently compressed or resized images, add a perceptual-hash review pass (for example with Pillow/imagehash); the current automatic elimination is exact-content SHA-256, which cannot mistakenly merge two similar-looking teams.

## 5. Generate reports and load PostgreSQL

```sh
python3 scripts/logos/pipeline.py build
```

Outputs under `data/logos/out/`:

- `assets.csv`: unique file inventory, source paths, SHA-256, format, dimensions and alpha where Pillow is installed.
- `candidates.csv`: candidate links and matching evidence.
- `selected.csv`: one high-confidence winner per BetFlux entity.
- `missing.csv`: entities still lacking an automatic selection; this is also the secondary-source work queue.
- `review.csv`: uncertain/ambiguous assignments requiring a decision or better alias/ID.
- `duplicates.csv`: exact duplicate paths collapsed by SHA-256.

Apply the additive tables and view with the normal migration runner, then load the catalog:

```sh
npm run migrations
DATABASE_URL="$DATABASE_URL" node scripts/logos/load-db.mjs
```

The loader is transactional and idempotent: it upserts the entities, assets and candidate decisions, and resets the old selected winner before applying the newly generated `selected.csv`. The application reads the logo by `betflux_entity_id` from `sports_entity_logos`; serve files from object storage/CDN using `canonical_path`, or store the SVG/PNG files in Supabase Storage and replace that path with its public object key.

## Refresh schedule

- Nightly or weekly: set `DATABASE_URL`, provider keys and `ESPN_LEAGUES`, then run `scripts/logos/refresh.sh`. It refreshes configured APIs, reimports ZIPs already in the inbox, rebuilds reports and loads the DB catalog. Schedule it with cron/launchd or your deployment scheduler.
- When new TCM/football-logos.cc packs are released: download the official pack/update into the inbox, then the same refresh imports it. API polling cannot detect an unpublished/undownloaded archive.
- Before changing the production selection policy: inspect `missing.csv`/`review.csv` and add verified names/IDs to the entity crosswalk. The loader only publishes high-confidence matches.
- Each run is additive for assets. Do not delete old candidates/assets automatically; losing or changing a source does not erase history. Track source release/date in your operations log and periodically recheck `selected.csv` against entity/provider changes.
- Before serving production: expose only `sports_entity_logos` or a purpose-built API projection, not the entire candidate table. Cache static logo files by SHA-256 and set a long cache age; a new selected hash naturally invalidates the entity's URL.
