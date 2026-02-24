"""
OpenCERN API — Datasets Router
Supports pagination and all experiments: CMS, ALICE, ATLAS
"""
from fastapi import APIRouter
import httpx
from services.catalog import fetch_cms_datasets, fetch_opendata_datasets

router = APIRouter()


@router.get("/datasets")
async def get_datasets(experiment: str = "ALICE", page: int = 1, size: int = 20):
    """
    Fetch datasets with pagination.

    Returns: { datasets: [...], total: N, page: P, pages: T }

    For CMS hardcoded datasets, pagination is ignored (only 6 entries).
    For ALICE, ATLAS, or 'all', pagination is passed through to CERN OpenData API.
    """
    async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=30) as client:
        if experiment == "CMS":
            return await fetch_cms_datasets(client)
        return await fetch_opendata_datasets(client, experiment, page, size)
