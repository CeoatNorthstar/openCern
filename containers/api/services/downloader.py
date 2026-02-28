"""
OpenCERN API — Async Download Engine
Fully non-blocking with httpx streaming, resumable downloads, progress tracking,
subfolder support for multi-file datasets, and auto-archive extraction.
"""
import os
import logging
import httpx
from models import DownloadStatus
from config import DATA_DIR, DOWNLOAD_CHUNK_SIZE, DOWNLOAD_TIMEOUT
from services.archive_handler import is_archive, extract_archive

log = logging.getLogger("opencern.downloader")

# ──────────────────────────────────────────────────────────────────
# Global State
# ──────────────────────────────────────────────────────────────────
download_status: dict[str, DownloadStatus] = {}
cancelled_downloads: set[str] = set()

_client: httpx.AsyncClient | None = None


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(verify=False, follow_redirects=True, timeout=DOWNLOAD_TIMEOUT)
    return _client


# ──────────────────────────────────────────────────────────────────
# Core Download Logic
# ──────────────────────────────────────────────────────────────────
async def download_file_async(file_url: str, filename: str, subfolder: str = None):
    """
    Stream-download a file with progress tracking and cancellation.
    If subfolder is set, downloads into DATA_DIR/subfolder/filename.
    After download, auto-detects and extracts archives (zip/tar.gz).
    """
    if subfolder:
        dest_dir = os.path.join(DATA_DIR, subfolder)
        os.makedirs(dest_dir, exist_ok=True)
        filepath = os.path.join(dest_dir, filename)
        track_key = f"{subfolder}/{filename}"
    else:
        filepath = os.path.join(DATA_DIR, filename)
        track_key = filename

    client = await get_client()

    try:
        if track_key in download_status:
            download_status[track_key].status = "downloading"

        # Get total size
        head = await client.head(file_url, timeout=30)
        total_size = int(head.headers.get("content-length", 0))

        downloaded = 0
        log.info(f"Downloading {track_key} ({total_size / 1e6:.1f} MB)")

        async with client.stream("GET", file_url) as response:
            response.raise_for_status()
            with open(filepath, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=DOWNLOAD_CHUNK_SIZE):
                    if track_key in cancelled_downloads:
                        log.info(f"Download cancelled: {track_key}")
                        if track_key in download_status:
                            download_status[track_key].status = "cancelled"
                        return

                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0 and track_key in download_status:
                        download_status[track_key].progress = round((downloaded / total_size) * 100, 1)

        # ── Post-download: auto-extract archives ──
        if is_archive(filepath):
            log.info(f"Archive detected: {track_key} — extracting ROOT files...")
            if track_key in download_status:
                download_status[track_key].status = "extracting"

            extract_dest = dest_dir if subfolder else DATA_DIR
            extracted = extract_archive(filepath, extract_dest)
            log.info(f"Extraction complete: {len(extracted)} ROOT file(s)")

        if track_key in download_status:
            download_status[track_key].status = "done"
            download_status[track_key].progress = 100.0
        log.info(f"Download complete: {track_key}")

    except Exception as e:
        log.error(f"Download failed: {track_key} — {e}")
        if track_key in download_status:
            download_status[track_key].status = "error"

