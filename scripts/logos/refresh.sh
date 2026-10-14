#!/usr/bin/env bash
set -euo pipefail

python3 scripts/logos/pipeline.py extract

if [[ -n "${API_FOOTBALL_KEY:-}" ]]; then
  python3 scripts/logos/pipeline.py api-football --seasons "${LOGO_SEASONS:-2025,2026}"
fi

if [[ -n "${ESPN_LEAGUES:-}" ]]; then
  python3 scripts/logos/pipeline.py espn --leagues "$ESPN_LEAGUES"
fi

if [[ -n "${THESPORTSDB_API_KEY:-}" ]]; then
  python3 scripts/logos/pipeline.py thesportsdb
fi

if [[ -f data/logos/wikidata.csv ]]; then
  python3 scripts/logos/pipeline.py download-catalog \
    --input data/logos/wikidata.csv \
    --output data/logos/wikidata-downloaded.csv
fi

python3 scripts/logos/pipeline.py build \
  --provider-catalog data/logos/espn-downloaded.csv \
  --provider-catalog data/logos/thesportsdb-downloaded.csv \
  --provider-catalog data/logos/wikidata-downloaded.csv

npm run migrations
node scripts/logos/load-db.mjs
