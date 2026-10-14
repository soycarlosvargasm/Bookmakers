#!/usr/bin/env python3
"""Build a deduplicated, ID-linked sports logo library for BetFlux.

Zero third-party dependencies. Pillow is optional and only used to inspect raster
dimensions/alpha. See docs/LOGO_PIPELINE.md for input schemas and workflow.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
ASSET_EXTS = {".svg", ".png", ".webp", ".jpg", ".jpeg", ".gif"}
PRIORITY = {
    "tcm26": 100, "football-logos.cc": 95, "josearroyave": 90,
    "api-football": 85, "espn": 80, "thesportsdb": 75,
    "wikidata": 70, "sportmonks": 70, "unknown": 10,
}


def norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold()).encode("ascii", "ignore").decode().replace("&", " and ")
    value = re.sub(r"\b[0-9a-f]{8,}\b", " ", value)
    value = re.sub(r"\.(svg|png|webp|jpe?g|gif)$", "", value)
    value = re.sub(r"\b(logo|crest|badge|emblem|icon|team|fc|cf|sc|ac|club)\b", " ", value)
    value = re.sub(r"\b(\d{2,4}x\d{2,4}|\d{3,4}px|small|medium|large|dark|light|white|black)\b", " ", value)
    value = re.sub(r"[._-]+", " ", value)
    return " ".join(re.findall(r"[a-z0-9]+", value))


def load_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise SystemExit(f"Missing input: {path}")
    with path.open(newline="", encoding="utf-8-sig") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def extract(args: argparse.Namespace) -> None:
    inbox, out = args.inbox, args.assets
    out.mkdir(parents=True, exist_ok=True)
    zips = sorted(inbox.glob("*.zip"))
    if not zips:
        print(f"No ZIP files found in {inbox}")
        return
    for archive in zips:
        dest = out / archive.stem
        dest.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive) as zf:
            for member in zf.infolist():
                name = PurePosixPath(member.filename)
                if name.is_absolute() or ".." in name.parts:
                    continue
                target = dest.joinpath(*name.parts)
                if member.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as src, target.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
        print(f"Extracted {archive.name} -> {dest}")


def request_json(url: str, headers: dict[str, str] | None = None) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "BetFluxLogoPipeline/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read())


def download(url: str, target: Path) -> bool:
    if target.exists() and target.stat().st_size > 0:
        return False
    target.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "BetFluxLogoPipeline/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as response, target.open("wb") as f:
            shutil.copyfileobj(response, f)
        if target.stat().st_size == 0:
            target.unlink(missing_ok=True)
            return False
        return True
    except (urllib.error.URLError, TimeoutError) as exc:
        target.unlink(missing_ok=True)
        print(f"WARN download failed {url}: {exc}", file=sys.stderr)
        return False


def api_football(args: argparse.Namespace) -> None:
    headers = {"x-apisports-key": args.api_key}
    out = args.assets / "api-football"
    out.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    countries_url = "https://v3.football.api-sports.io/teams/countries"
    countries = request_json(countries_url, headers).get("response", [])
    for country in countries:
        page = 1
        while True:
            query = urllib.parse.urlencode({"country": country["name"], "page": page})
            data = request_json(f"https://v3.football.api-sports.io/teams?{query}", headers)
            for row in data.get("response", []):
                team = row.get("team", {})
                url = team.get("logo")
                if not url:
                    continue
                target = out / "teams" / country.get("code", "unknown").lower() / f"{team.get('id')}.png"
                download(url, target)
                records.append({"provider": "api-football", "provider_id": team.get("id"), "entity_type": "team", "sport": "football", "name": team.get("name", ""), "country": team.get("country", country.get("name", "")), "competition": "", "url": url, "path": str(target.relative_to(args.assets)), "aliases": ""})
            paging = data.get("paging", {})
            if page >= int(paging.get("total", 1)):
                break
            page += 1
            time.sleep(args.delay)
        if args.delay:
            time.sleep(args.delay)
    # Current-season league logos. Pass an explicit season or several comma-separated seasons.
    for season in args.seasons.split(","):
        page = 1
        while True:
            query = urllib.parse.urlencode({"season": season, "page": page})
            data = request_json(f"https://v3.football.api-sports.io/leagues?{query}", headers)
            for row in data.get("response", []):
                league = row.get("league", {})
                url = league.get("logo")
                if not url:
                    continue
                target = out / "leagues" / str(season) / f"{league.get('id')}.png"
                download(url, target)
                records.append({"provider": "api-football", "provider_id": league.get("id"), "entity_type": "league", "sport": "football", "name": league.get("name", ""), "country": row.get("country", {}).get("name", ""), "competition": "", "url": url, "path": str(target.relative_to(args.assets)), "aliases": ""})
            paging = data.get("paging", {})
            if page >= int(paging.get("total", 1)):
                break
            page += 1
            time.sleep(args.delay)
    write_csv(args.output, records, ["provider", "provider_id", "entity_type", "sport", "name", "country", "competition", "url", "path", "aliases"])
    print(f"Saved {len(records)} provider records to {args.output}")


def download_catalog(args: argparse.Namespace) -> None:
    """Download a normalized provider CSV; lets ESPN, TheSportsDB and Wikidata share one importer."""
    records = load_csv(args.input)
    persist_provider_records(records, args.assets, args.output, args.delay)


def persist_provider_records(records: list[dict[str, str]], assets: Path, output: Path, delay: float = 0.0) -> None:
    out_records = []
    for row in records:
        url = row.get("url", "")
        if not url:
            continue
        parsed = urllib.parse.urlparse(url)
        ext = Path(parsed.path).suffix.casefold()
        if ext not in ASSET_EXTS:
            ext = ".png"
        provider = row.get("provider", "unknown").strip().casefold()
        entity_type = row.get("entity_type", "team").strip().casefold()
        provider_id = row.get("provider_id", "").strip() or hashlib.sha1(url.encode()).hexdigest()[:16]
        country = norm(row.get("country", "unknown")).replace(" ", "-") or "unknown"
        folder_kind = norm(entity_type).replace(" ", "-") or "team"
        target = assets / provider / folder_kind / country / f"{provider_id}{ext}"
        download(url, target)
        out_records.append({**row, "provider": provider, "provider_id": provider_id, "entity_type": entity_type, "path": str(target.relative_to(assets))})
        if delay:
            time.sleep(delay)
    write_csv(output, out_records, ["provider", "provider_id", "entity_type", "sport", "name", "country", "competition", "url", "path", "aliases"])
    print(f"Downloaded/registered {len(out_records)} URLs; catalog={output}")


def espn_sync(args: argparse.Namespace) -> None:
    records = []
    for item in args.leagues.split(","):
        item = item.strip().strip("/")
        if "/" not in item:
            print(f"WARN expected sport/league ESPN slug, skipped {item}", file=sys.stderr)
            continue
        sport, league = item.split("/", 1)
        url = f"https://site.api.espn.com/apis/site/v2/sports/{item}/teams?limit=1000"
        data = request_json(url)
        team_rows = []
        for block in data.get("sports", []):
            for lg in block.get("leagues", []):
                team_rows.extend(lg.get("teams", []))
        for wrapper in team_rows:
            team = wrapper.get("team", wrapper)
            logos = team.get("logos", [])
            logo_url = team.get("logo")
            if logos:
                def size(logo):
                    return (logo.get("width") or 0) * (logo.get("height") or 0)
                logo_url = max(logos, key=size).get("href") or logo_url
            if not logo_url:
                continue
            records.append({"provider": "espn", "provider_id": str(team.get("id", "")), "entity_type": "team", "sport": sport, "name": team.get("displayName") or team.get("name", ""), "country": team.get("location", ""), "competition": league, "url": logo_url, "aliases": "|".join(filter(None, [team.get("abbreviation", ""), team.get("shortDisplayName", "")]))})
        if args.delay:
            time.sleep(args.delay)
    persist_provider_records(records, args.assets, args.output, args.delay)


def thesportsdb_sync(args: argparse.Namespace) -> None:
    key = args.api_key or os.getenv("THESPORTSDB_API_KEY") or "123"
    headers = {"X-API-KEY": key} if key != "123" else None
    base = f"https://www.thesportsdb.com/api/v1/json/{urllib.parse.quote(key, safe='') }"
    league_data = request_json(f"{base}/all_leagues.php", headers)
    leagues = league_data.get("leagues") or league_data.get("data") or []
    records = []
    for league in leagues:
        league_name = league.get("strLeague") or league.get("name", "")
        sport = league.get("strSport") or "unknown"
        country = league.get("strCountry") or ""
        league_id = str(league.get("idLeague") or league.get("id") or "")
        league_logo = league.get("strBadge") or league.get("strLogo")
        if league_logo:
            records.append({"provider": "thesportsdb", "provider_id": league_id, "entity_type": "league", "sport": sport, "name": league_name, "country": country, "competition": "", "url": league_logo, "aliases": ""})
        query = urllib.parse.urlencode({"l": league_name.replace(" ", "_")})
        teams_data = request_json(f"{base}/search_all_teams.php?{query}", headers)
        for team in teams_data.get("teams") or []:
            logo_url = team.get("strBadge") or team.get("strTeamBadge")
            if not logo_url:
                continue
            records.append({"provider": "thesportsdb", "provider_id": str(team.get("idTeam", "")), "entity_type": "team", "sport": team.get("strSport") or sport, "name": team.get("strTeam", ""), "country": team.get("strCountry") or country, "competition": league_name, "url": logo_url, "aliases": "|".join(filter(None, [team.get("strTeamShort", ""), team.get("strAlternate", "")]))})
        if args.delay:
            time.sleep(args.delay)
    persist_provider_records(records, args.assets, args.output, args.delay)


def source_of(path: Path, root: Path) -> str:
    parts = [p.casefold() for p in path.relative_to(root).parts]
    joined = "/".join(parts)
    for key in PRIORITY:
        if key in joined:
            return key
    if "tcm" in joined or "logos tcm" in joined:
        return "tcm26"
    if "football-logos" in joined:
        return "football-logos.cc"
    if "josearroyave" in joined:
        return "josearroyave"
    return "unknown"


def config_records(root: Path) -> dict[str, tuple[str, str]]:
    """Map a TCM config.xml image path to (FM object class, object ID)."""
    mapped: dict[str, tuple[str, str]] = {}
    for config in root.rglob("config.xml"):
        try:
            tree = ET.parse(config)
        except (ET.ParseError, OSError):
            continue
        for record in tree.iter("record"):
            source, target = record.attrib.get("from"), record.attrib.get("to", "")
            m = re.search(r"graphics/pictures/(club|competition|nation|team|stadium)/([^/]+)/logo", target, re.I)
            if source and m:
                image = (config.parent / source).resolve()
                try:
                    mapped[str(image.relative_to(root.resolve()))] = (m.group(1).casefold(), m.group(2))
                except ValueError:
                    pass
    return mapped


def image_info(path: Path) -> tuple[int | None, int | None, bool | None]:
    try:
        from PIL import Image  # optional Pillow
        with Image.open(path) as image:
            alpha = "A" in image.getbands() or "transparency" in image.info
            return image.width, image.height, alpha
    except Exception:
        return None, None, None


@dataclass
class Entity:
    row: dict[str, str]
    names: list[str]
    keys: set[str]


def load_entities(path: Path) -> list[Entity]:
    entities = []
    for row in load_csv(path):
        required = ["betflux_id", "entity_type", "sport", "name"]
        if any(not row.get(k) for k in required):
            continue
        names = [row["name"]] + [x.strip() for x in row.get("aliases", "").split("|") if x.strip()]
        keys = {norm(n) for n in names if norm(n)}
        for field in ("api_football_id", "espn_id", "thesportsdb_id", "fm_id", "wikidata_id"):
            if row.get(field):
                keys.add(f"id {field.replace('_id','')} {row[field]}")
        entities.append(Entity(row, names, keys))
    return entities


def main_build(args: argparse.Namespace) -> None:
    root, out = args.assets.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    entities = load_entities(args.entities)
    if not entities:
        raise SystemExit("No usable BetFlux entities in entities.csv")
    fm_map = config_records(root)
    name_index: dict[str, list[Entity]] = {}
    country_index: dict[str, list[Entity]] = {}
    competition_index: dict[str, list[Entity]] = {}
    prefix_index: dict[str, set[str]] = {}
    entity_by_id = {e.row["betflux_id"]: e for e in entities}
    for e in entities:
        for key in e.keys:
            name_index.setdefault(key, []).append(e)
            for word in key.split():
                if len(word) >= 3:
                    prefix_index.setdefault(word[:3], set()).add(e.row["betflux_id"])
        if e.row.get("country"):
            country_index.setdefault(norm(e.row["country"]), []).append(e)
        if e.row.get("competition"):
            competition_index.setdefault(norm(e.row["competition"]), []).append(e)
    fm_id_to_entity: dict[tuple[str, str], Entity] = {}
    external_to_entity: dict[tuple[str, str, str], Entity] = {}
    for e in entities:
        row = e.row
        if row.get("fm_id"):
            fm_map_type = {"team": "club", "club": "club", "national_team": "nation", "league": "competition", "tournament": "competition"}.get(row.get("entity_type", "").casefold(), row.get("entity_type", "").casefold())
            fm_id_to_entity[(fm_map_type, row["fm_id"])] = e
        for column, provider, kind in (
            ("api_football_id", "api-football", "team"),
            ("api_football_league_id", "api-football", "league"),
            ("espn_id", "espn", "team"),
            ("thesportsdb_id", "thesportsdb", row.get("entity_type", "").casefold()),
            ("wikidata_id", "wikidata", row.get("entity_type", "").casefold()),
        ):
            if row.get(column):
                external_to_entity[(provider, kind, row[column])] = e

    # Provider catalogs link numeric-ID filenames to stable BetFlux IDs before name matching.
    catalog_by_path: dict[str, dict[str, str]] = {}
    for catalog in args.provider_catalog:
        if catalog.exists():
            for row in load_csv(catalog):
                if row.get("path"):
                    catalog_by_path[row["path"]] = row

    # Exact file hashes collapse identical copies, but all source paths are retained.
    exact: dict[str, dict] = {}
    files = [p for p in root.rglob("*") if p.is_file() and p.suffix.casefold() in ASSET_EXTS]
    for path in files:
        rel = str(path.relative_to(root))
        source = source_of(path, root)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        width, height, alpha = image_info(path)
        item = exact.setdefault(digest, {"sha256": digest, "path": rel, "paths": [], "source": source, "ext": path.suffix.casefold(), "bytes": path.stat().st_size, "width": width, "height": height, "alpha": alpha})
        item["paths"].append(rel)
        if PRIORITY.get(source, 0) > PRIORITY.get(item["source"], 0):
            item["source"], item["path"] = source, rel

    candidates: list[dict] = []
    review: list[dict] = []
    forced = 0
    for asset in exact.values():
        rel = asset["path"]
        base = Path(rel).stem
        tokens = [norm(Path(part).stem) for part in Path(rel).parts]
        searchable = " ".join(t for t in tokens if t)
        fm = next((fm_map[p] for p in asset["paths"] if p in fm_map), None)
        forced_entity = fm_id_to_entity.get(fm) if fm else None
        provider_row = next((catalog_by_path[p] for p in asset["paths"] if p in catalog_by_path), None)
        if provider_row:
            forced_entity = external_to_entity.get((provider_row.get("provider", ""), provider_row.get("entity_type", ""), provider_row.get("provider_id", "")), forced_entity)
            # Numeric CDN filenames still match by metadata name/country if the crosswalk has not yet got this provider ID.
            tokens.extend(norm(provider_row.get(field, "")) for field in ("name", "country", "competition", "aliases") if provider_row.get(field))
            searchable = " ".join(t for t in tokens if t)
        # High-confidence exact name index. Name matching uses leaf + parent folder names;
        # fuzzy comparisons are constrained to the same country/competition when possible.
        exact_hits: list[Entity] = []
        seen_exact: set[str] = set()
        for token in tokens + [searchable]:
            for entity in name_index.get(token, []):
                if entity.row["betflux_id"] not in seen_exact:
                    exact_hits.append(entity)
                    seen_exact.add(entity.row["betflux_id"])
        if exact_hits:
            pool = exact_hits
        else:
            country_matches = [e for token in tokens for e in country_index.get(token, [])]
            comp_matches = [e for token in tokens for e in competition_index.get(token, [])]
            pool = country_matches or comp_matches
            if not pool:
                # Avoid O(assets × all entities) fuzzy matching on the 75k TCM files.
                # Only fuzzy-match when the filename has a meaningful name token.
                leaf = norm(base)
                if len(leaf) < 5:
                    pool = []
                else:
                    first = leaf.split()[0]
                    pool = [entity_by_id[eid] for eid in prefix_index.get(first[:3], set())]
        asset_matches: list[dict] = []
        for entity in entities:
            if entity not in pool and (not forced_entity or forced_entity.row["betflux_id"] != entity.row["betflux_id"]):
                continue
            row = entity.row
            if provider_row and provider_row.get("sport") and norm(provider_row["sport"]) != norm(row.get("sport", "")):
                continue
            source_types = {"team", "club", "national team", "nation", "league", "competition", "tournament", "federation"}
            path_kinds = {norm(part) for part in Path(rel).parts[:-1]}
            path_kinds = {kind for kind in path_kinds if kind in source_types}
            kind_norm = norm(row.get("entity_type", ""))
            if path_kinds and kind_norm not in path_kinds and not (kind_norm == "club" and "team" in path_kinds) and not (kind_norm == "team" and "club" in path_kinds):
                if not forced_entity or forced_entity.row["betflux_id"] != row["betflux_id"]:
                    continue
            if forced_entity and forced_entity.row["betflux_id"] == row["betflux_id"]:
                score, method = 1.0, "tcm-config+fm-id"
            else:
                best = 0.0
                exact_name = False
                for key in entity.keys:
                    if not key:
                        continue
                    if key in tokens or key == searchable or (len(key) >= 5 and f" {key} " in f" {searchable} "):
                        best, exact_name = 1.0, True
                        break
                    for token in tokens:
                        if token:
                            best = max(best, SequenceMatcher(None, key, token).ratio())
                score, method = best, "name-exact" if exact_name else "name-fuzzy"
                country = norm(row.get("country", ""))
                path_countries = {norm(part) for part in Path(rel).parts[:-1]}
                if country and country in path_countries:
                    score = min(1.0, score + 0.025)
                elif country and path_countries.intersection(country_index):
                    score = max(0.0, score - 0.20)
                competition = norm(row.get("competition", ""))
                if competition and competition in searchable:
                    score = min(1.0, score + 0.02)
            if score < args.review_threshold:
                continue
            if forced_entity and forced_entity.row["betflux_id"] == row["betflux_id"]:
                forced += 1
            source_rank = PRIORITY.get(asset["source"], 10)
            area = (asset["width"] or 0) * (asset["height"] or 0)
            quality = min(1.0, area / (512 * 512)) if area else 0.5
            if asset["ext"] == ".svg":
                quality = 1.0
            elif asset["alpha"]:
                quality = min(1.0, quality + 0.08)
            rank = score * 1000 + source_rank * 20 + quality * 50
            asset_matches.append({"betflux_id": row["betflux_id"], "entity_type": row["entity_type"], "sport": row["sport"], "name": row["name"], "sha256": asset["sha256"], "path": asset["path"], "all_paths": "|".join(asset["paths"]), "source": asset["source"], "source_rank": source_rank, "url": provider_row.get("url", "") if provider_row else "", "format": asset["ext"].lstrip("."), "bytes": asset["bytes"], "width": asset["width"], "height": asset["height"], "alpha": asset["alpha"], "confidence": round(score, 4), "match_method": method, "quality": round(quality, 4), "rank": round(rank, 3), "evidence": ";".join(entity.names[:4])})
        best_by_entity: dict[str, dict] = {}
        for match in asset_matches:
            previous = best_by_entity.get(match["betflux_id"])
            if previous is None or match["confidence"] > previous["confidence"]:
                best_by_entity[match["betflux_id"]] = match
        ordered_asset_matches = sorted(best_by_entity.values(), key=lambda r: r["confidence"], reverse=True)
        forced_id = forced_entity.row["betflux_id"] if forced_entity else None
        ambiguous = len(ordered_asset_matches) > 1 and ordered_asset_matches[0]["confidence"] - ordered_asset_matches[1]["confidence"] < args.match_margin and not forced_id
        if ambiguous:
            for match in ordered_asset_matches[:5]:
                match["match_method"] = "ambiguous:" + match["match_method"]
                match["confidence"] = min(match["confidence"], args.auto_threshold - 0.01)
                review.append(match)
        elif ordered_asset_matches:
            candidates.extend(ordered_asset_matches)

    # Choose one preferred asset per BetFlux entity; retain every candidate and review below threshold.
    by_entity: dict[str, list[dict]] = {}
    for row in candidates:
        by_entity.setdefault(row["betflux_id"], []).append(row)
    selected = []
    for betflux_id, rows in by_entity.items():
        rows.sort(key=lambda r: (r["confidence"] >= args.auto_threshold, r["rank"], r["sha256"]), reverse=True)
        best = rows[0].copy()
        if best["confidence"] < args.auto_threshold:
            continue
        best["candidate_count"] = len(rows)
        best["alternates"] = "|".join(r["sha256"] for r in rows[1:])
        selected.append(best)
    selected_ids = {row["betflux_id"] for row in selected}
    missing_ids = {e.row["betflux_id"] for e in entities} - selected_ids
    review.extend(r for r in candidates if r["confidence"] < args.auto_threshold)
    duplicates = [{"sha256": a["sha256"], "canonical_path": a["path"], "duplicate_paths": "|".join(p for p in a["paths"] if p != a["path"]), "copies": len(a["paths"]), "dedupe_method": "sha256-exact"} for a in exact.values() if len(a["paths"]) > 1]
    asset_rows = [{**asset, "paths": "|".join(asset["paths"])} for asset in exact.values()]
    write_csv(out / "assets.csv", asset_rows, ["sha256", "path", "paths", "source", "ext", "bytes", "width", "height", "alpha"])
    write_csv(out / "candidates.csv", candidates, ["betflux_id", "entity_type", "sport", "name", "sha256", "path", "all_paths", "source", "source_rank", "url", "format", "bytes", "width", "height", "alpha", "confidence", "match_method", "quality", "rank", "evidence"])
    write_csv(out / "selected.csv", selected, ["betflux_id", "entity_type", "sport", "name", "sha256", "path", "all_paths", "source", "source_rank", "url", "format", "bytes", "width", "height", "alpha", "confidence", "match_method", "quality", "rank", "candidate_count", "alternates"])
    write_csv(out / "review.csv", review, ["betflux_id", "entity_type", "sport", "name", "sha256", "path", "source", "confidence", "match_method", "evidence"])
    write_csv(out / "duplicates.csv", duplicates, ["sha256", "canonical_path", "duplicate_paths", "copies", "dedupe_method"])
    write_csv(out / "missing.csv", [{"betflux_id": e.row["betflux_id"], "entity_type": e.row["entity_type"], "sport": e.row["sport"], "name": e.row["name"], "country": e.row.get("country", ""), "competition": e.row.get("competition", "")} for e in entities if e.row["betflux_id"] in missing_ids], ["betflux_id", "entity_type", "sport", "name", "country", "competition"])
    print(f"assets={len(exact)} candidates={len(candidates)} selected={len(selected)} review={len(review)} missing={len(missing_ids)} duplicates={len(duplicates)} tcm_config_matches={forced}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("extract", help="extract every ZIP in an inbox to separate asset folders")
    p.add_argument("--inbox", type=Path, default=ROOT / "data/logos/inbox")
    p.add_argument("--assets", type=Path, default=ROOT / "data/logos/assets")
    p.set_defaults(func=extract)
    p = sub.add_parser("api-football", help="fetch teams by country and league logos for seasons")
    p.add_argument("--api-key", default=os.getenv("API_FOOTBALL_KEY"))
    p.add_argument("--seasons", default=str(__import__("datetime").date.today().year))
    p.add_argument("--delay", type=float, default=0.25)
    p.add_argument("--assets", type=Path, default=ROOT / "data/logos/assets")
    p.add_argument("--output", type=Path, default=ROOT / "data/logos/api-football.csv")
    p.set_defaults(func=api_football)
    p = sub.add_parser("download-catalog", help="download standardized provider URL CSVs (ESPN/TheSportsDB/Wikidata)")
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--assets", type=Path, default=ROOT / "data/logos/assets")
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--delay", type=float, default=0.1)
    p.set_defaults(func=download_catalog)
    p = sub.add_parser("espn", help="fetch logos for ESPN league slugs, e.g. football/nfl,basketball/nba")
    p.add_argument("--leagues", required=True, help="comma-separated sport/league slugs; examples football/nfl,baseball/mlb,hockey/nhl,soccer/eng.1")
    p.add_argument("--assets", type=Path, default=ROOT / "data/logos/assets")
    p.add_argument("--output", type=Path, default=ROOT / "data/logos/espn-downloaded.csv")
    p.add_argument("--delay", type=float, default=0.2)
    p.set_defaults(func=espn_sync)
    p = sub.add_parser("thesportsdb", help="enumerate accessible leagues and teams and download strBadge logos")
    p.add_argument("--api-key", default=os.getenv("THESPORTSDB_API_KEY", "123"))
    p.add_argument("--assets", type=Path, default=ROOT / "data/logos/assets")
    p.add_argument("--output", type=Path, default=ROOT / "data/logos/thesportsdb-downloaded.csv")
    p.add_argument("--delay", type=float, default=0.25)
    p.set_defaults(func=thesportsdb_sync)
    p = sub.add_parser("build", help="hash, match, rank and report logo coverage")
    p.add_argument("--entities", type=Path, default=ROOT / "data/logos/entities.csv")
    p.add_argument("--assets", type=Path, default=ROOT / "data/logos/assets")
    p.add_argument("--output", type=Path, default=ROOT / "data/logos/out")
    p.add_argument("--provider-catalog", type=Path, action="append", default=[ROOT / "data/logos/api-football.csv"], help="standard CSV with provider,provider_id,entity_type,sport,name,path columns; repeatable")
    p.add_argument("--review-threshold", type=float, default=0.82)
    p.add_argument("--auto-threshold", type=float, default=0.96)
    p.add_argument("--match-margin", type=float, default=0.08, help="minimum score gap between entity matches; lower gaps go to review")
    p.set_defaults(func=main_build)
    args = parser.parse_args()
    if args.command == "api-football" and not args.api_key:
        parser.error("Set API_FOOTBALL_KEY or pass --api-key")
    args.func(args)


if __name__ == "__main__":
    main()
