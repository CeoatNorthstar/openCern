"""
OpenCERN API — Dataset Catalog Service
Fully async with TTL caching and full catalog fetching. No blocking I/O.

Pulls EVERY available dataset from CERN OpenData for CMS, ALICE, and ATLAS.
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
# These are merged into the full CMS catalog from CERN OpenData.
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
            log.debug(f"Cache HIT: {key}")
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
    """Parse CERN OpenData API records into Dataset models."""
    datasets = []
    for record in records:
        metadata = record.get("metadata", {})
        files = [
            _convert_xrootd_to_http(f.get("uri", ""))
            for f in metadata.get("files", [])
            if f.get("uri", "").endswith(".root")
        ]
        if not files:
            continue
        datasets.append(Dataset(
            id=str(record.get("id", "")),
            title=metadata.get("title", ""),
            description=metadata.get("abstract", {}).get("description", ""),
            files=files,
            size=str(sum(f.get("size", 0) for f in metadata.get("files", []))),
            year=int(metadata.get("date_created", ["0"])[0]) if metadata.get("date_created") else 0,
        ))
    return datasets


# ──────────────────────────────────────────────────────────────────
# Core: Fetch ALL datasets for an experiment from CERN OpenData
# ──────────────────────────────────────────────────────────────────
async def _fetch_all_from_cern(client: httpx.AsyncClient, experiment: str) -> List[Dataset]:
    """
    Fetch the ENTIRE catalog for a given experiment by paginating
    through all available pages from the CERN OpenData API.
    Results are cached for 5 minutes.
    """
    cache_key = f"full_catalog_{experiment}"
    cached = _get_cached(cache_key)
    if cached is not None:
        log.info(f"Returning cached catalog for {experiment} ({len(cached)} datasets)")
        return cached

    base_url = "https://opendata.cern.ch/api/records/"
    params = "type=Dataset&file_type=root&format=json&subtype=Collision"
    if experiment != "all":
        params += f"&experiment={experiment}"

    all_datasets = []
    page = 1
    page_size = 100  # Max per request for efficiency

    while True:
        url = f"{base_url}?{params}&page={page}&size={page_size}"
        log.info(f"Fetching {experiment} page {page}...")

        try:
            resp = await client.get(url, timeout=30)
            data = resp.json()
        except Exception as e:
            log.error(f"CERN API request failed (page {page}): {e}")
            break

        hits = data.get("hits", {})
        total = hits.get("total", 0)
        records = hits.get("hits", [])

        if not records:
            break

        batch = _parse_records(records)
        all_datasets.extend(batch)

        total_pages = math.ceil(total / page_size)
        log.info(f"  → Got {len(batch)} datasets (page {page}/{total_pages}, total: {total})")

        if page >= total_pages:
            break
        page += 1

        # Small delay to be respectful to CERN servers
        await asyncio.sleep(0.1)

    log.info(f"Catalog complete: {experiment} → {len(all_datasets)} datasets")
    _set_cached(cache_key, all_datasets)
    return all_datasets


# ──────────────────────────────────────────────────────────────────
# Public: Paginated responses for each experiment
# ──────────────────────────────────────────────────────────────────
async def fetch_datasets(client: httpx.AsyncClient, experiment: str, page: int = 1, size: int = 20) -> dict:
    """
    Fetch the full catalog, then paginate client-side for fast response.
    First call may take a few seconds; subsequent calls are instant (cached).
    """
    if experiment == "CMS":
        # Merge featured (hardcoded) + full CERN OpenData CMS catalog
        cern_datasets = await _fetch_all_from_cern(client, "CMS")
        featured = [Dataset(**d, size="0") for d in CMS_FEATURED]

        # Deduplicate: featured first, then CERN datasets not already in featured
        featured_titles = {d.title for d in featured}
        merged = featured + [d for d in cern_datasets if d.title not in featured_titles]
        all_datasets = merged
    elif experiment == "all":
        # Fetch all experiments in parallel
        cms_task = _fetch_all_from_cern(client, "CMS")
        alice_task = _fetch_all_from_cern(client, "ALICE")
        atlas_task = _fetch_all_from_cern(client, "ATLAS")
        cms, alice, atlas = await asyncio.gather(cms_task, alice_task, atlas_task)

        featured = [Dataset(**d, size="0") for d in CMS_FEATURED]
        featured_titles = {d.title for d in featured}
        all_datasets = featured + [d for d in cms if d.title not in featured_titles] + alice + atlas
    else:
        # ALICE, ATLAS, or any other experiment
        exp_param = experiment if experiment != "Alice" else "ALICE"
        all_datasets = await _fetch_all_from_cern(client, exp_param)

    # Client-side pagination over the full cached catalog
    total = len(all_datasets)
    total_pages = max(1, math.ceil(total / size))
    page = min(page, total_pages)
    start = (page - 1) * size
    end = start + size

    return {
        "datasets": all_datasets[start:end],
        "total": total,
        "page": page,
        "pages": total_pages,
    }
