"""
OpenCERN API — Processing Router
"""
import os
import json
import logging
import subprocess
from fastapi import APIRouter, BackgroundTasks, Request
from config import DATA_DIR, PROCESSED_DIR

log = logging.getLogger("opencern.processing")
router = APIRouter()

process_status: dict[str, str] = {}


def run_processor(filepath: str, filename: str):
    """Spawn the data-processor container ephemerally via Docker socket."""
    container_filepath = f"/home/appuser/opencern-datasets/data/{filename}"
    log.info(f"Spawning processor for {filename}")

    result = subprocess.run([
        "docker", "run", "--rm",
        "--volumes-from", "opencern-api",
        "opencern-processor",
        container_filepath
    ])

    if result.returncode == 0:
        process_status[filename] = "processed"
        log.info(f"Processing complete: {filename}")
    else:
        process_status[filename] = "error"
        log.error(f"Processing failed: {filename} (exit code {result.returncode})")


@router.post("/process")
async def process_file(filename: str, background_tasks: BackgroundTasks):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found"}

    process_status[filename] = "processing"
    background_tasks.add_task(run_processor, filepath, filename)
    return {"message": "Processing started", "status": "processing"}


@router.get("/process/status")
async def get_process_status(filename: str):
    stem = os.path.splitext(filename)[0]
    output_file = os.path.join(PROCESSED_DIR, f"{stem}.json")
    if os.path.exists(output_file):
        return {"status": "processed"}
    status = process_status.get(filename, "idle")
    return {"status": status}


@router.put("/process/data/{filename}")
async def save_processed_data(filename: str, request: Request):
    data = await request.json()
    stem = os.path.splitext(filename)[0]
    output_file = os.path.join(PROCESSED_DIR, f"{stem}.json")
    with open(output_file, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    return {"status": "saved"}


@router.delete("/process/data/{filename}")
async def delete_processed_data(filename: str):
    stem = os.path.splitext(filename)[0]
    output_file = os.path.join(PROCESSED_DIR, f"{stem}.json")
    if os.path.exists(output_file):
        os.remove(output_file)
        return {"message": f"{stem}.json deleted"}
    return {"error": "File not found"}
