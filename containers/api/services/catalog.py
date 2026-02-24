"""
OpenCERN API — Dataset Catalog Service
Fully async with TTL caching. No blocking I/O.
"""
import time
import logging
import httpx
from typing import List, Optional
from models import Dataset

log = logging.getLogger("opencern.catalog")

# ──────────────────────────────────────────────────────────────────
# Hardcoded CMS HTTP Datasets (no CERN API needed for these)
# ──────────────────────────────────────────────────────────────────
CMS_HTTP_DATASETS = [
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
_cache: dict = {}  # key → (timestamp, data)


def _get_cached(key: str, ttl: int) -> Optional[list]:
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < ttl:
            log.debug(f"Cache HIT for '{key}'")
            return data
    return None


def _set_cached(key: str, data: list):
    _cache[key] = (time.time(), data)


# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────
def _convert_xrootd_to_http(uri: str) -> str:
    if uri.startswith("root://eospublic.cern.ch//"):
        return uri.replace("root://eospublic.cern.ch//", "https://eospublic.cern.ch/")
    return uri


# ──────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────
async def get_file_size_async(client: httpx.AsyncClient, url: str) -> int:
    """Non-blocking HEAD request to get file size."""
    try:
        resp = await client.head(url, follow_redirects=True, timeout=10)
        return int(resp.headers.get("content-length", 0))
    except Exception:
        return 0


async def fetch_cms_datasets(client: httpx.AsyncClient) -> List[Dataset]:
    """Fetch CMS datasets with async parallel size lookups."""
    cache_key = "cms"
    cached = _get_cached(cache_key, ttl=300)
    if cached is not None:
        return cached

    import asyncio
    sizes = await asyncio.gather(
        *[get_file_size_async(client, d["files"][0]) for d in CMS_HTTP_DATASETS]
    )
    results = [
        Dataset(**d, size=str(sizes[i]))
        for i, d in enumerate(CMS_HTTP_DATASETS)
    ]
    _set_cached(cache_key, results)
    return results


async def fetch_opendata_datasets(client: httpx.AsyncClient, experiment: str) -> List[Dataset]:
    """Fetch datasets from CERN Open Data portal with caching."""
    cache_key = f"opendata_{experiment}"
    cached = _get_cached(cache_key, ttl=300)
    if cached is not None:
        return cached

    if experiment == "all":
        url = "https://opendata.cern.ch/api/records/?type=Dataset&file_type=root&page=1&size=20&format=json&subtype=Collision"
    else:
        url = f"https://opendata.cern.ch/api/records/?type=Dataset&experiment={experiment}&file_type=root&page=1&size=20&format=json&subtype=Collision"

    resp = await client.get(url, timeout=30)
    data = resp.json()
    datasets = []

    for record in data.get("hits", {}).get("hits", []):
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

    _set_cached(cache_key, datasets)
    return datasets
