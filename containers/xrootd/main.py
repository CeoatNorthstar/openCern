"""
OpenCERN XRootD Proxy — root:// Protocol Gateway
===================================================
Lightweight FastAPI server that handles XRootD (root://) protocol
downloads using the native C++ XRootD client via Python bindings.

This runs as a Docker container alongside the API, streaming CERN
grid data to the shared ~/opencern-datasets volume.
"""
import os
import logging
import asyncio
from enum import Enum
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("opencern.xrootd")

app = FastAPI(title="OpenCERN XRootD Proxy", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.expanduser("~/opencern-datasets/data/")
os.makedirs(DATA_DIR, exist_ok=True)

CHUNK_SIZE = 131072  # 128KB

# ──────────────────────────────────────────────────────────────────
# Download State
# ──────────────────────────────────────────────────────────────────
class DLStatus(str, Enum):
    PENDING = "pending"
    DOWNLOADING = "downloading"
    DONE = "done"
    ERROR = "error"
    CANCELLED = "cancelled"

download_state: dict = {}
cancelled: set = set()


# ──────────────────────────────────────────────────────────────────
# XRootD Download Logic
# ──────────────────────────────────────────────────────────────────
def xrootd_download_sync(uri: str, filename: str):
    """
    Blocking download using XRootD client.
    Run in a thread via asyncio.to_thread().
    """
    try:
        from XRootD import client as xrdclient
        from XRootD.client.flags import OpenFlags
    except ImportError:
        log.error("XRootD Python bindings not available. Install python3-xrootd.")
        download_state[filename]["status"] = DLStatus.ERROR
        download_state[filename]["error"] = "XRootD bindings not installed"
        return

    filepath = os.path.join(DATA_DIR, filename)
    download_state[filename]["status"] = DLStatus.DOWNLOADING

    try:
        # Get file size first
        fs = xrdclient.FileSystem(uri.split("//")[0] + "//" + uri.split("//")[1].split("/")[0])
        path = "/" + "/".join(uri.split("//")[1].split("/")[1:])

        status, stat_info = fs.stat(path)
        if not status.ok:
            # Fallback: try to open and read without knowing size
            total_size = 0
        else:
            total_size = stat_info.size

        log.info(f"XRootD downloading: {uri} ({total_size / 1e6:.1f} MB)")

        # Open and stream
        f = xrdclient.File()
        status, _ = f.open(uri, OpenFlags.READ)
        if not status.ok:
            raise RuntimeError(f"XRootD open failed: {status.message}")

        downloaded = 0
        with open(filepath, "wb") as out:
            while True:
                if filename in cancelled:
                    download_state[filename]["status"] = DLStatus.CANCELLED
                    f.close()
                    log.info(f"XRootD download cancelled: {filename}")
                    return

                status, data = f.read(downloaded, CHUNK_SIZE)
                if not status.ok:
                    raise RuntimeError(f"XRootD read error: {status.message}")
                if len(data) == 0:
                    break

                out.write(data)
                downloaded += len(data)
                if total_size > 0:
                    download_state[filename]["progress"] = round((downloaded / total_size) * 100, 1)

        f.close()
        download_state[filename]["status"] = DLStatus.DONE
        download_state[filename]["progress"] = 100.0
        log.info(f"XRootD download complete: {filename} ({downloaded / 1e6:.1f} MB)")

    except Exception as e:
        log.error(f"XRootD download failed: {filename} — {e}")
        download_state[filename]["status"] = DLStatus.ERROR
        download_state[filename]["error"] = str(e)


async def xrootd_download_task(uri: str, filename: str):
    """Async wrapper that runs the blocking XRootD download in a thread."""
    await asyncio.to_thread(xrootd_download_sync, uri, filename)


# ──────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "xrootd-proxy"}


@app.post("/fetch")
async def fetch(uri: str, filename: str, background_tasks: BackgroundTasks):
    """Start an XRootD download in the background."""
    if not uri.startswith("root://"):
        return {"error": "URI must use root:// protocol"}

    download_state[filename] = {
        "filename": filename,
        "uri": uri,
        "status": DLStatus.PENDING,
        "progress": 0.0,
        "error": None,
    }
    background_tasks.add_task(xrootd_download_task, uri, filename)
    return {"message": "XRootD download started", "status": "pending"}


@app.get("/status")
async def status(filename: str):
    """Check download status."""
    state = download_state.get(filename)
    if state:
        return state
    return {"error": "No download found for this filename"}


@app.post("/cancel")
async def cancel(filename: str):
    """Cancel an in-progress download."""
    cancelled.add(filename)
    if filename in download_state:
        download_state[filename]["status"] = DLStatus.CANCELLED
    return {"message": f"Cancellation requested for {filename}"}


@app.on_event("startup")
async def startup():
    log.info("╔══════════════════════════════════════════════════════╗")
    log.info("║  OpenCERN XRootD Proxy v1.0 — Online                ║")
    log.info("╚══════════════════════════════════════════════════════╝")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8081, reload=True)
