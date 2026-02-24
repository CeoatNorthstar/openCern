"""
OpenCERN API — Downloads Router
"""
from fastapi import APIRouter, BackgroundTasks
from models import DownloadStatus
from services.downloader import download_status, cancelled_downloads, download_file_async

router = APIRouter()


@router.post("/download")
async def start_download(file_url: str, filename: str, background_tasks: BackgroundTasks):
    download_status[filename] = DownloadStatus(filename=filename, status="pending", progress=0.0)
    background_tasks.add_task(download_file_async, file_url, filename)
    return {"message": "Download started", "status": "pending"}


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
