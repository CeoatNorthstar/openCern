from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import aiofiles
import os
from pydantic import BaseModel
from typing import List
from fastapi import BackgroundTasks

app = FastAPI()

# TODO 1: Add CORS middleware so Electron can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity
    allow_methods=["*"],
    allow_headers=["*"],
)
# TODO 2: Create a Dataset model using pydantic BaseModel with:
# - id: str
# - title: str
# - description: str
# - files: list[str]
# - size: str
# - year: int
#
#
class Dataset(BaseModel):
    id: str
    title: str
    description: str
    files: List[str]
    size: str
    year: int





# TODO 3: Create a DownloadStatus model with:
# - filename: str
# - status: str (pending, downloading, done, error)
# - progress: float (0-100)
#
class DownloadStatus(BaseModel):
    filename: str
    status: str  # pending, downloading, done, error
    progress: float  # 0-100

# TODO 4: Create a global dict to track download statuses
# download_status = {}
#
download_status = {}


# TODO 5: Write GET /datasets that:
# - Hits https://opendata.cern.ch/api/records/?format=json
# - Parses response
# - Returns list of datasets
#
#
@app.get("/datasets")
async def get_datasets():
    url = "https://opendata.cern.ch/api/records/?type=Dataset&file_type=root&page=1&size=10&format=json"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        datasets = []
        for record in data.get("hits", {}).get("hits", []):
            metadata = record.get("metadata", {})
            dataset = Dataset(
                id=str(record.get("id", "")),
                title=metadata.get("title", ""),
                description=metadata.get("abstract", {}).get("description", ""),
                files=[f.get("uri", "") for f in metadata.get("files", []) if f.get("uri", "").endswith(".root")],
                size=str(sum(f.get("size", 0) for f in metadata.get("files", []))),
                year=int(metadata.get("data_created", ["0"])[0]) if metadata.get("data_created") else 0,
            )
            datasets.append(dataset)
        return datasets
# - Accepts file URL and filename
# - Creates ~/opencern/data/ if not exists
# - Downloads file in background task
# - Updates download_status as it progresses
# - Returns immediately with status "pending"
#
    # Start background task to download file
async def download_task():
    try:
        download_status[filename].status = "downloading"
        async with httpx.AsyncClient() as client:
            response = await client.get(file_url)
            total_size = int(response.headers.get("Content-Length", 0))
            downloaded_size = 0

            async with aiofiles.open(os.path.expanduser(f"~/opencern-datasets/data/{filename}"), "wb") as f:
                async for chunk in response.iter_bytes():

                    await f.write(chunk)
                    downloaded_size += len(chunk)
                    if total_size > 0:
                        download_status[filename].progress = (downloaded_size / total_size) * 100

        download_status[filename].status = "done"
        download_status[filename].progress = 100.0
    except Exception as e:
        download_status[filename].status = "error"
        print(f"Error downloading {filename}: {e}")
@app.post("/download")
async def start_download(file_url: str, filename: str, background_tasks: BackgroundTasks):
    # Create data directory if it doesn't exist
    data_dir = os.path.expanduser("~/opencern-datasets/data/")
    os.makedirs(data_dir, exist_ok=True)

    # Initialize download status
    download_status[filename] = DownloadStatus(filename=filename, status="pending", progress=0.0)

    # Start background task to download file
    background_tasks.add_task(download_task)

    return {"message": "Download started", "status": "pending"}

# TODO 7: Write GET /download/status that:
# - Accepts filename query param
# - Returns current download status and progress
#
@app.get("/download/status")
async def get_download_status(filename: str):
    status = download_status.get(filename)
    if status:
        return status
    else:
        return {"error": "File not found in download status"}

# TODO 8: Write GET /files that:
# - Reads ~/opencern/data/
# - Returns list of downloaded files with sizes
@app.get("/files")
async def list_files():
    data_dir = os.path.expanduser("~/opencern-datasets/data/")
    files = []
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            file_path = os.path.join(data_dir, filename)
            if os.path.isfile(file_path):
                size = os.path.getsize(file_path)
                files.append({"filename": filename, "size": size})
    return files

# TODO 9: Write DELETE /files/{filename} that:
# - Deletes file from ~/opencern/data/
# - Removes from download_status dict

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.expanduser(f"~/opencern-datasets/data/{filename}")
    if os.path.exists(file_path):
        os.remove(file_path)
        download_status.pop(filename, None)
        return {"message": f"{filename} deleted"}
    else:
        return {"error": "File not found"}

# TODO 10: Run with uvicorn on port 8080
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
