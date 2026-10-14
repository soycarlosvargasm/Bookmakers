import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const base = resolve("data/logos");
const entitiesPath = process.argv[2] ?? resolve(base, "entities.csv");
const out = process.argv[3] ?? resolve(base, "out");
const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set SUPABASE_DB_URL or DATABASE_URL");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [header, ...data] = rows;
  return data.filter(r => r.some(Boolean)).map(r => Object.fromEntries(header.map((key, i) => [key, r[i] ?? ""])));
}

async function csv(path) {
  return parseCsv(await readFile(path, "utf8"));
}

const [entities, assets, candidates, selected] = await Promise.all([
  csv(entitiesPath), csv(resolve(out, "assets.csv")), csv(resolve(out, "candidates.csv")), csv(resolve(out, "selected.csv")),
]);
const selectedIds = new Set(selected.map(r => `${r.betflux_id}\0${r.sha256}`));
const candidateUrl = new Map(candidates.filter(r => r.url).map(r => [r.sha256, r.url]));
const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const row of entities) {
    if (!row.betflux_id || !row.entity_type || !row.sport || !row.name) continue;
    const externalIds = {
      api_football: row.api_football_id || null,
      api_football_league: row.api_football_league_id || null,
      espn: row.espn_id || null,
      thesportsdb: row.thesportsdb_id || null,
      wikidata: row.wikidata_id || null,
      football_manager: row.fm_id || null,
    };
    await client.query(`
      INSERT INTO sports_logo_entities
        (betflux_entity_id, entity_type, sport_key, display_name, country, competition, aliases, external_ids, updated_at)
      VALUES ($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),$7,$8::jsonb,now())
      ON CONFLICT (betflux_entity_id) DO UPDATE SET
        entity_type=EXCLUDED.entity_type, sport_key=EXCLUDED.sport_key,
        display_name=EXCLUDED.display_name, country=EXCLUDED.country,
        competition=EXCLUDED.competition, aliases=EXCLUDED.aliases,
        external_ids=EXCLUDED.external_ids, updated_at=now()`,
    [row.betflux_id, row.entity_type, row.sport, row.name, row.country, row.competition,
      (row.aliases || "").split("|").map(s => s.trim()).filter(Boolean), JSON.stringify(externalIds)]);
  }

  await client.query("UPDATE sports_logo_candidates SET selected=false WHERE betflux_entity_id = ANY($1::text[])", [entities.map(r => r.betflux_id).filter(Boolean)]);
  for (const row of assets) {
    await client.query(`
      INSERT INTO sports_logo_assets
        (sha256, source_key, source_url, canonical_path, source_paths, media_type, byte_size, width, height, has_alpha, last_seen_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,now())
      ON CONFLICT (sha256) DO UPDATE SET source_key=EXCLUDED.source_key,
        source_url=COALESCE(EXCLUDED.source_url,sports_logo_assets.source_url),
        canonical_path=EXCLUDED.canonical_path, source_paths=EXCLUDED.source_paths,
        media_type=EXCLUDED.media_type, byte_size=EXCLUDED.byte_size,
        width=EXCLUDED.width, height=EXCLUDED.height, has_alpha=EXCLUDED.has_alpha,
        last_seen_at=now()`,
    [row.sha256, row.source, candidateUrl.get(row.sha256) ?? null, row.path,
      JSON.stringify((row.paths || "").split("|").filter(Boolean)), `image/${row.ext === "jpg" ? "jpeg" : row.ext}`,
      Number(row.bytes || 0), row.width ? Number(row.width) : null, row.height ? Number(row.height) : null,
      row.alpha === "True" ? true : row.alpha === "False" ? false : null]);
  }
  for (const row of candidates) {
    await client.query(`
      INSERT INTO sports_logo_candidates
        (betflux_entity_id, asset_sha256, source_key, match_method, confidence, quality_score, source_rank, selected, evidence, evaluated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now())
      ON CONFLICT (betflux_entity_id,asset_sha256) DO UPDATE SET
        source_key=EXCLUDED.source_key, match_method=EXCLUDED.match_method,
        confidence=EXCLUDED.confidence, quality_score=EXCLUDED.quality_score,
        source_rank=EXCLUDED.source_rank, selected=EXCLUDED.selected,
        evidence=EXCLUDED.evidence, evaluated_at=now()`,
    [row.betflux_id, row.sha256, row.source, row.match_method, Number(row.confidence), Number(row.quality), Number(row.source_rank || 10),
      selectedIds.has(`${row.betflux_id}\0${row.sha256}`), JSON.stringify({ path: row.path, all_paths: row.all_paths, url: row.url || null, format: row.format })]);
  }
  await client.query("COMMIT");
  console.log(`loaded entities=${entities.length} assets=${assets.length} candidates=${candidates.length} selected=${selected.length}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
