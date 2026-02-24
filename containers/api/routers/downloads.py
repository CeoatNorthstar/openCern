"""
OpenCERN API — Downloads Router
Supports both HTTP and XRootD (root://) protocol downloads.
"""
import logging
import httpx
from fastapi import APIRouter, BackgroundTasks
from models import DownloadStatus
from services.downloader import download_status, cancelled_downloads, download_file_async

log = logging.getLogger("opencern.downloads")
router = APIRouter()


@router.post("/download")
async def start_download(file_url: str, filename: str, background_tasks: BackgroundTasks):
    download_status[filename] = DownloadStatus(filename=filename, status="pending", progress=0.0)
    background_tasks.add_task(download_file_async, file_url, filename)
    return {"message": "Download started", "status": "pending"}


@router.post("/download/xrootd")
async def start_xrootd_download(uri: str, filename: str):
    """Proxy an XRootD download to the xrootd container."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"http://opencern-xrootd:8081/fetch?uri={uri}&filename={filename}"
            )
            return resp.json()
    except Exception as e:
        log.error(f"XRootD proxy failed: {e}")
        return {"error": f"XRootD proxy unavailable: {str(e)}"}


@router.get("/download/xrootd/status")
async def xrootd_download_status(filename: str):
    """Check XRootD download status via the xrootd container."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"http://opencern-xrootd:8081/status?filename={filename}"
            )
            return resp.json()
    except Exception as e:
        return {"error": f"XRootD proxy unavailable: {str(e)}"}


@router.post("/download/cancel")
async def cancel_download(filename: str):
    cancelled_downloads.add(filename)
    if filename in download_status:
        download_status[filename].status = "cancelled"
    return {"message": f"Download of {filename} cancelled"}


@router.post("/download/resume")
async def resume_download(file_url: str, filename: str, background_tasks: BackgroundTasks):
    if filename in cancelled_downloads:
        cancelled_downloads.discard(filename)
        download_status[filename] = DownloadStatus(filename=filename, status="pending", progress=0.0)
        background_tasks.add_task(download_file_async, file_url, filename)
        return {"message": f"Download of {filename} resumed"}
    return {"error": f"No cancelled download found for {filename}"}


@router.get("/download/status")
async def get_download_status(filename: str):
    status = download_status.get(filename)
    if status:
        return status
    return {"error": "File not found in download status"}
