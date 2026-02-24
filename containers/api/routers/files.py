"""
OpenCERN API — Files Router
"""
import os
import logging
from fastapi import APIRouter
from config import DATA_DIR

log = logging.getLogger("opencern.files")
router = APIRouter()


@router.get("/files")
async def list_files():
    files = []
    if os.path.exists(DATA_DIR):
        for filename in os.listdir(DATA_DIR):
            if filename.startswith("."):
                continue
            file_path = os.path.join(DATA_DIR, filename)
            if os.path.isfile(file_path):
                files.append({"filename": filename, "size": os.path.getsize(file_path)})
    files.sort(key=lambda x: x["filename"])
    return files


@router.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.join(DATA_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": f"{filename} deleted"}
    return {"error": "File not found"}


@router.get("/files/{filename}/reveal")
async def reveal_file(filename: str):
    file_path = os.path.join(DATA_DIR, filename)
    if os.path.exists(file_path):
        import subprocess
        subprocess.run(["open", "-R", file_path])
        return {"message": f"{filename} revealed"}
    return {"error": "File not found"}
