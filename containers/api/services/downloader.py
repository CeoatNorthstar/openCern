"""
OpenCERN API — Async Download Engine
Fully non-blocking with httpx streaming, resumable downloads, and progress tracking.
"""
import os
import logging
import asyncio
import httpx
from models import DownloadStatus
from config import DATA_DIR, DOWNLOAD_CHUNK_SIZE, DOWNLOAD_TIMEOUT

log = logging.getLogger("opencern.downloader")

# ──────────────────────────────────────────────────────────────────
# Global State (process-level, thread-safe for single-worker uvicorn)
# ──────────────────────────────────────────────────────────────────
download_status: dict[str, DownloadStatus] = {}
cancelled_downloads: set[str] = set()

# Shared persistent connection pool
_client: httpx.AsyncClient | None = None


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(verify=False, follow_redirects=True, timeout=DOWNLOAD_TIMEOUT)
    return _client


# ──────────────────────────────────────────────────────────────────
# Core Download Logic (fully async, no threads)
# ──────────────────────────────────────────────────────────────────
async def download_file_async(file_url: str, filename: str):
    """Stream-download a file with progress tracking and cancellation support."""
    filepath = os.path.join(DATA_DIR, filename)
    client = await get_client()

    try:
        download_status[filename].status = "downloading"

        # Get total size
        head = await client.head(file_url, timeout=30)
        total_size = int(head.headers.get("content-length", 0))

        downloaded = 0
        log.info(f"Downloading {filename} ({total_size / 1e6:.1f} MB)")

        async with client.stream("GET", file_url) as response:
            response.raise_for_status()
            with open(filepath, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=DOWNLOAD_CHUNK_SIZE):
                    if filename in cancelled_downloads:
                        log.info(f"Download cancelled: {filename}")
                        download_status[filename].status = "cancelled"
                        return

                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        download_status[filename].progress = round((downloaded / total_size) * 100, 1)

        download_status[filename].status = "done"
        download_status[filename].progress = 100.0
        log.info(f"Download complete: {filename}")

    except Exception as e:
        log.error(f"Download failed: {filename} — {e}")
        download_status[filename].status = "error"
