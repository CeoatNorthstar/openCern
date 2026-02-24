"""
OpenCERN API — Dataset Catalog Service
Fully async with TTL caching. Pulls EVERY dataset from CERN OpenData.
"""
import time
import math
import logging
import asyncio
import httpx
from typing import List, Optional
from models import Dataset

log = logging.getLogger("opencern.catalog")

# ──────────────────────────────────────────────────────────────────
# Featured CMS datasets (direct HTTP links, always available)
# ──────────────────────────────────────────────────────────────────
CMS_FEATURED = [
    {"id": "cms-001", "title": "Run2012B TauPlusX — Higgs to Tau Tau", "description": "Real CMS collision data from Run2012B.", "files": ["https://root.cern/files/HiggsTauTauReduced/Run2012B_TauPlusX.root"], "year": 2012},
    {"id": "cms-002", "title": "Run2012C TauPlusX — Higgs to Tau Tau", "description": "Real CMS collision data from Run2012C.", "files": ["https://root.cern/files/HiggsTauTauReduced/Run2012C_TauPlusX.root"], "year": 2012},
    {"id": "cms-003", "title": "GluGluToHToTauTau — Higgs Signal MC", "description": "Simulated Higgs boson production via gluon fusion.", "files": ["https://root.cern/files/HiggsTauTauReduced/GluGluToHToTauTau.root"], "year": 2012},
    {"id": "cms-004", "title": "VBF HToTauTau — Vector Boson Fusion MC", "description": "Simulated Higgs boson via vector boson fusion.", "files": ["https://root.cern/files/HiggsTauTauReduced/VBF_HToTauTau.root"], "year": 2012},
    {"id": "cms-005", "title": "DYJetsToLL — Drell-Yan Background", "description": "Simulated Drell-Yan process.", "files": ["https://root.cern/files/HiggsTauTauReduced/DYJetsToLL.root"], "year": 2012},
    {"id": "cms-006", "title": "TTbar — Top Quark Pair Production", "description": "Simulated top quark pair production.", "files": ["https://root.cern/files/HiggsTauTauReduced/TTbar.root"], "year": 2012},
]

# ──────────────────────────────────────────────────────────────────
# TTL Cache
# ──────────────────────────────────────────────────────────────────
_cache: dict = {}


def _get_cached(key: str, ttl: int = 300):
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < ttl:
            return data
    return None


def _set_cached(key: str, data):
    _cache[key] = (time.time(), data)


# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────
def _convert_xrootd_to_http(uri: str) -> str:
    if uri.startswith("root://eospublic.cern.ch//"):
        return uri.replace("root://eospublic.cern.ch//", "https://eospublic.cern.ch/")
    return uri


def _parse_records(records: list) -> List[Dataset]:
    """Parse CERN OpenData API records into Dataset models.
    Includes ALL datasets, even those without .root files."""
    datasets = []
    for record in records:
        metadata = record.get("metadata", {})
        raw_files = metadata.get("files", [])

        # Collect all file URIs, converting xrootd to http where possible
        all_files = [
            _convert_xrootd_to_http(f.get("uri", ""))
            for f in raw_files
            if f.get("uri", "")
        ]

        # If no files in the record, check for doi/links
        # Some CERN records reference files via dataset_semantics or use_with
        if not all_files:
            doi = metadata.get("doi", "")
            recid = str(record.get("id", ""))
            if recid:
                all_files = [f"https://opendata.cern.ch/record/{recid}"]

        total_size = sum(f.get("size", 0) for f in raw_files)

        datasets.append(Dataset(
            id=str(record.get("id", "")),
            title=metadata.get("title", "Untitled Dataset"),
            description=metadata.get("abstract", {}).get("description", "No description available."),
            files=all_files if all_files else [f"https://opendata.cern.ch/record/{record.get('id', '')}"],
            size=str(total_size),
            year=int(metadata.get("date_created", ["0"])[0]) if metadata.get("date_created") else 0,
        ))
    return datasets


# ──────────────────────────────────────────────────────────────────
# Core: Fetch ALL datasets for an experiment
# ──────────────────────────────────────────────────────────────────
async def _fetch_all_from_cern(client: httpx.AsyncClient, experiment: str, max_pages: int = 50) -> List[Dataset]:
    """
    Fetch the complete catalog by auto-paginating the CERN OpenData API.
    No restrictive filters — pulls every dataset for the experiment.
    """
    cache_key = f"full_{experiment}"
    cached = _get_cached(cache_key)
    if cached is not None:
        log.info(f"Cache HIT: {experiment} ({len(cached)} datasets)")
        return cached

    # NO file_type or subtype filters — get EVERYTHING
    base = "https://opendata.cern.ch/api/records/"
    params = f"type=Dataset&format=json&experiment={experiment}"

    all_datasets = []
    pg = 1
    page_size = 100

    while pg <= max_pages:
        url = f"{base}?{params}&page={pg}&size={page_size}"
        log.info(f"Fetching {experiment} page {pg}...")

        try:
            resp = await client.get(url, timeout=30)
            data = resp.json()
        except Exception as e:
            log.error(f"CERN API error (page {pg}): {e}")
            break

        hits = data.get("hits", {})
        total = hits.get("total", 0)
        records = hits.get("hits", [])

        if not records:
            break

        batch = _parse_records(records)
        all_datasets.extend(batch)

        total_pages = math.ceil(total / page_size)
        log.info(f"  → {len(batch)} datasets (page {pg}/{total_pages}, total: {total})")

        if pg >= total_pages:
            break
        pg += 1
        await asyncio.sleep(0.05)

    log.info(f"Catalog complete: {experiment} → {len(all_datasets)} datasets")
    _set_cached(cache_key, all_datasets)
    return all_datasets


# ──────────────────────────────────────────────────────────────────
# Public API: paginated dataset responses
# ──────────────────────────────────────────────────────────────────
async def fetch_datasets(client: httpx.AsyncClient, experiment: str, page: int = 1, size: int = 20) -> dict:
    """
    Returns a paginated slice of the full cached catalog.
    First call fetches all pages from CERN; subsequent calls are instant.
    """
    if experiment == "CMS":
        cern_datasets = await _fetch_all_from_cern(client, "CMS")
        featured = [Dataset(**d, size="0") for d in CMS_FEATURED]
        featured_titles = {d.title for d in featured}
        all_ds = featured + [d for d in cern_datasets if d.title not in featured_titles]
    elif experiment == "all":
        cms_t = _fetch_all_from_cern(client, "CMS")
        alice_t = _fetch_all_from_cern(client, "ALICE")
        atlas_t = _fetch_all_from_cern(client, "ATLAS")
        cms, alice, atlas = await asyncio.gather(cms_t, alice_t, atlas_t)
        featured = [Dataset(**d, size="0") for d in CMS_FEATURED]
        featured_titles = {d.title for d in featured}
        all_ds = featured + [d for d in cms if d.title not in featured_titles] + alice + atlas
    else:
        exp_param = experiment if experiment != "Alice" else "ALICE"
        all_ds = await _fetch_all_from_cern(client, exp_param)

    total = len(all_ds)
    total_pages = max(1, math.ceil(total / size))
    page = min(page, total_pages)
    start = (page - 1) * size
    end = start + size

    return {
        "datasets": all_ds[start:end],
        "total": total,
        "page": page,
        "pages": total_pages,
    }
