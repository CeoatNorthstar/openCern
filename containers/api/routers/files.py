"""
OpenCERN API — Files Router
Lists files with nested folder support for multi-file datasets.
"""
import os
import logging
import shutil
from fastapi import APIRouter
from config import DATA_DIR

log = logging.getLogger("opencern.files")
router = APIRouter()


@router.get("/files")
async def list_files():
    """
    List all files and folders in DATA_DIR.
    Returns a flat list where folders are represented as groups with children.
    """
    items = []
    if not os.path.exists(DATA_DIR):
        return items

    for entry in sorted(os.listdir(DATA_DIR)):
        if entry.startswith("."):
            continue
        full_path = os.path.join(DATA_DIR, entry)

        if os.path.isdir(full_path):
            # Dataset folder — list its children
            children = []
            folder_size = 0
            for child in sorted(os.listdir(full_path)):
                if child.startswith("."):
                    continue
                child_path = os.path.join(full_path, child)
                if os.path.isfile(child_path):
                    child_size = os.path.getsize(child_path)
                    folder_size += child_size
                    children.append({
                        "filename": f"{entry}/{child}",
                        "basename": child,
                        "size": child_size,
                        "folder": entry,
                    })
            items.append({
                "filename": entry,
                "type": "folder",
                "size": folder_size,
                "children": children,
                "file_count": len(children),
            })
        elif os.path.isfile(full_path):
            items.append({
                "filename": entry,
                "type": "file",
                "size": os.path.getsize(full_path),
            })

    return items


@router.get("/files/{folder:path}")
async def list_folder_files(folder: str):
    """List files inside a specific dataset folder."""
    folder_path = os.path.join(DATA_DIR, folder)
    if not os.path.isdir(folder_path):
        return {"error": "Folder not found"}

    files = []
    for entry in sorted(os.listdir(folder_path)):
        if entry.startswith("."):
            continue
        fp = os.path.join(folder_path, entry)
        if os.path.isfile(fp):
            files.append({
                "filename": f"{folder}/{entry}",
                "basename": entry,
                "size": os.path.getsize(fp),
                "folder": folder,
            })
    return files


@router.delete("/files/{filepath:path}")
async def delete_file(filepath: str):
    """Delete a file or entire dataset folder."""
    full_path = os.path.join(DATA_DIR, filepath)
    if os.path.isdir(full_path):
        shutil.rmtree(full_path)
        return {"message": f"Folder {filepath} deleted"}
    elif os.path.isfile(full_path):
        os.remove(full_path)
        return {"message": f"{filepath} deleted"}
    return {"error": "File not found"}


@router.get("/files/{filename}/reveal")
async def reveal_file(filename: str):
    file_path = os.path.join(DATA_DIR, filename)
    if os.path.exists(file_path):
        import subprocess
        subprocess.run(["open", "-R", file_path])
        return {"message": f"{filename} revealed"}
    return {"error": "File not found"}
