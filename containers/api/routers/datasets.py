"""
OpenCERN API — Datasets Router
"""
from fastapi import APIRouter
import httpx
from services.catalog import fetch_cms_datasets, fetch_opendata_datasets

router = APIRouter()


@router.get("/datasets")
async def get_datasets(experiment: str = "ALICE"):
    async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=30) as client:
        if experiment == "CMS":
            return await fetch_cms_datasets(client)
        return await fetch_opendata_datasets(client, experiment)
