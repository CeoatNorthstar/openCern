"""
OpenCERN API — Processing Router
Supports experiment-aware processing with selective file processing.
"""
import os
import json
import logging
import subprocess
from fastapi import APIRouter, BackgroundTasks, Request
from pydantic import BaseModel
from typing import List, Optional
from config import DATA_DIR, PROCESSED_DIR

log = logging.getLogger("opencern.processing")
router = APIRouter()

process_status: dict[str, str] = {}


class ProcessRequest(BaseModel):
    files: List[str]  # file paths relative to DATA_DIR
    experiment: str = "auto"  # auto, cms, atlas, alice


def run_processor(filepath: str, track_key: str, experiment: str = "auto"):
    """Run the C++ data processor binary directly (embedded in API container)."""
    full_path = os.path.join(DATA_DIR, filepath)
    log.info(f"Running C++ processor for {track_key} (experiment={experiment})")

    cmd = [
        "opencern-processor",
        full_path,
        "--experiment", experiment,
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600
        )

        # Log processor output
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                log.info(f"  [C++] {line}")
        if result.stderr:
            for line in result.stderr.strip().split('\n'):
                log.info(f"  [C++] {line}")

        if result.returncode == 0:
            process_status[track_key] = "processed"
            log.info(f"Processing complete: {track_key}")
        else:
            process_status[track_key] = "error"
            log.error(f"Processing failed: {track_key} (exit code {result.returncode})")
            if result.stderr:
                log.error(f"  stderr: {result.stderr[:500]}")
    except subprocess.TimeoutExpired:
        process_status[track_key] = "error"
        log.error(f"Processing timed out: {track_key} (>600s)")
    except Exception as e:
        process_status[track_key] = "error"
        log.error(f"Processing exception: {track_key} — {e}")


@router.post("/process")
async def process_file(filename: str, background_tasks: BackgroundTasks,
                       experiment: str = "auto"):
    """Process a single file with optional experiment override."""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found"}

    process_status[filename] = "processing"
    background_tasks.add_task(run_processor, filename, filename, experiment)
    return {"message": "Processing started", "status": "processing", "experiment": experiment}


@router.post("/process/batch")
async def process_batch(req: ProcessRequest, background_tasks: BackgroundTasks):
    """Process multiple selected files with experiment auto-detection or override."""
    results = []
    for rel_path in req.files:
        full_path = os.path.join(DATA_DIR, rel_path)
        if not os.path.exists(full_path):
            results.append({"file": rel_path, "error": "File not found"})
            continue

        process_status[rel_path] = "processing"
        background_tasks.add_task(run_processor, rel_path, rel_path, req.experiment)
        results.append({"file": rel_path, "status": "processing"})

    return {
        "message": f"Processing {len(results)} files",
        "experiment": req.experiment,
        "files": results,
    }


@router.get("/process/status")
async def get_process_status(filename: str):
    stem = os.path.splitext(filename)[0]
    # Check both the original filename and the stem
    output_file = os.path.join(PROCESSED_DIR, f"{stem}.json")
    if os.path.exists(output_file):
        return {"status": "processed"}
    # Check for folder/filename pattern
    basename = os.path.basename(stem)
    alt_output = os.path.join(PROCESSED_DIR, f"{basename}.json")
    if os.path.exists(alt_output):
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
