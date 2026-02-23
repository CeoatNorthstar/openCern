from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import aiofiles
import os
from pydantic import BaseModel
from typing import List
from fastapi import BackgroundTasks
import requests
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
class Dataset(BaseModel):
    id: str
    title: str
    description: str
    files: List[str]
    size: str
    year: int



CMS_HTTP_DATASETS = [
    {"id": "cms-001", "title": "Run2012B TauPlusX — Higgs to Tau Tau", "description": "Real CMS collision data from Run2012B.", "files": ["https://root.cern/files/HiggsTauTauReduced/Run2012B_TauPlusX.root"], "year": 2012},
    {"id": "cms-002", "title": "Run2012C TauPlusX — Higgs to Tau Tau", "description": "Real CMS collision data from Run2012C.", "files": ["https://root.cern/files/HiggsTauTauReduced/Run2012C_TauPlusX.root"], "year": 2012},
    {"id": "cms-003", "title": "GluGluToHToTauTau — Higgs Signal MC", "description": "Simulated Higgs boson production via gluon fusion.", "files": ["https://root.cern/files/HiggsTauTauReduced/GluGluToHToTauTau.root"], "year": 2012},
    {"id": "cms-004", "title": "VBF HToTauTau — Vector Boson Fusion MC", "description": "Simulated Higgs boson via vector boson fusion.", "files": ["https://root.cern/files/HiggsTauTauReduced/VBF_HToTauTau.root"], "year": 2012},
    {"id": "cms-005", "title": "DYJetsToLL — Drell-Yan Background", "description": "Simulated Drell-Yan process.", "files": ["https://root.cern/files/HiggsTauTauReduced/DYJetsToLL.root"], "year": 2012},
    {"id": "cms-006", "title": "TTbar — Top Quark Pair Production", "description": "Simulated top quark pair production.", "files": ["https://root.cern/files/HiggsTauTauReduced/TTbar.root"], "year": 2012},
]

# TODO 3: Create a DownloadStatus model with:
class DownloadStatus(BaseModel):
    filename: str
    status: str  # pending, downloading, done, error
    progress: float  # 0-100

# TODO 4: Create a global dict to track download statuses
download_status = {}

cancelled_downloads = set()


# TODO 5: Write GET /datasets that:
#Add a experiment query parameter that filters by experiment. So the endpoint becomes:
#GET /datasets?experiment=CMS
#GET /datasets?experiment=ALICE
#GET /datasets?experiment=all

# from the url = https://opendata.cern.ch/api/records/?type=Dataset&experiment=CMS&file_type=root&page=1&size=20&format=json
# change the above url to get datasets for ALICE and all experiments and CMS
#
def get_file_size(url: str) -> int:
    try:
        session = requests.Session()
        session.verify = False
        head = session.head(url, allow_redirects=True, timeout=10)
        return int(head.headers.get("Content-Length", 0))
    except:
        return 0
def convert_xrootd_to_http(uri: str) -> str:
    if uri.startswith("root://eospublic.cern.ch//"):
        return uri.replace("root://eospublic.cern.ch//", "https://eospublic.cern.ch/")
    return uri

@app.get("/datasets")
async def get_datasets(experiment: str = "ALICE"):
    if experiment == "CMS":
        results = []
        for d in CMS_HTTP_DATASETS:
            size = get_file_size(d["files"][0])
            results.append(Dataset(**d, size=str(size)))
        return results
            
    if experiment == "all":
        url = "https://opendata.cern.ch/api/records/?type=Dataset&file_type=root&page=1&size=20&format=json&subtype=Collision"
    else:
        url = f"https://opendata.cern.ch/api/records/?type=Dataset&experiment={experiment}&file_type=root&page=1&size=20&format=json&subtype=Collision"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        datasets = []
        for record in data.get("hits", {}).get("hits", []):
            metadata = record.get("metadata", {})
            files = [
                convert_xrootd_to_http(f.get("uri", ""))
                for f in metadata.get("files", [])
                if f.get("uri", "").endswith(".root")
            ]
            if not files:
                continue
            dataset = Dataset(
                id=str(record.get("id", "")),
                title=metadata.get("title", ""),
                description=metadata.get("abstract", {}).get("description", ""),
                files=files,
                size=str(sum(f.get("size", 0) for f in metadata.get("files", []))),
                year=int(metadata.get("date_created", ["0"])[0]) if metadata.get("date_created") else 0,
            )
            datasets.append(dataset)
        return datasets

# TODO 6: Write POST /download that:
def download_file_sync(file_url: str, filename: str):
    filepath = os.path.expanduser(f"~/opencern-datasets/data/{filename}")
    
    session = requests.Session()
    session.verify = False
    
    # Get total size first
    head = session.head(file_url, allow_redirects=True, timeout=30)
    total_size = int(head.headers.get("Content-Length", 0))
    
    downloaded_size = 0
    max_retries = 10
    
    with open(filepath, "wb") as f:
        while downloaded_size < total_size:
            if filename in cancelled_downloads:
                return
            
            headers = {"Range": f"bytes={downloaded_size}-"}
            
            try:
                response = session.get(file_url, headers=headers, stream=True, allow_redirects=True, timeout=60)
                
                for chunk in response.iter_content(chunk_size=65536):
                    if filename in cancelled_downloads:
                        return
                    if chunk:
                        f.write(chunk)
                        downloaded_size += len(chunk)
                        if total_size > 0:
                            download_status[filename].progress = (downloaded_size / total_size) * 100
            except Exception as e:
                print(f"Retrying {filename} from {downloaded_size} bytes... {e}")
                continue
    
    download_status[filename].status = "done"
    download_status[filename].progress = 100.0


async def download_task(file_url: str, filename: str):
    try:
        download_status[filename].status = "downloading"
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, download_file_sync, file_url, filename)
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
    background_tasks.add_task(download_task, file_url, filename)

    return {"message": "Download started", "status": "pending"}

@app.post("/download/cancel")
async def cancel_download(filename: str):
    cancelled_downloads.add(filename)
    if filename in download_status:
        download_status[filename].status = "cancelled"
    return {"message": f"Download of {filename} cancelled"}

@app.post("/download/resume")
async def resume_download(file_url: str, filename: str, background_tasks: BackgroundTasks):
    if filename in cancelled_downloads:
        cancelled_downloads.remove(filename)
        download_status[filename] = DownloadStatus(filename=filename, status="pending", progress=0.0)
        background_tasks.add_task(download_task, file_url, filename)
        return {"message": f"Download of {filename} resumed"}
    else:
        return {"error": f"No cancelled download found for {filename}"}

# TODO 7: Write GET /download/status that:
@app.get("/download/status")
async def get_download_status(filename: str):
    status = download_status.get(filename)
    if status:
        return status
    else:
        return {"error": "File not found in download status"}

# TODO 8: Write GET /files that:
@app.get("/files")
async def list_files():
    data_dir = os.path.expanduser("~/opencern-datasets/data/")
    files = []
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename == ".DS_Store":
                continue
            file_path = os.path.join(data_dir, filename)
            if os.path.isfile(file_path):
                size = os.path.getsize(file_path)
                files.append({"filename": filename, "size": size})
    # Sort files by name for consistency
    files.sort(key=lambda x: x["filename"])
    return files

# TODO 9: Write DELETE /files/{filename} that:
@app.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.expanduser(f"~/opencern-datasets/data/{filename}")
    if os.path.exists(file_path):
        os.remove(file_path)
        download_status.pop(filename, None)
        return {"message": f"{filename} deleted"}
    else:
        return {"error": "File not found"}

@app.get("/files/{filename}/reveal")
async def reveal_file(filename: str):
    file_path = os.path.expanduser(f"~/opencern-datasets/data/{filename}")
    if os.path.exists(file_path):
        import subprocess
        subprocess.run(["open", "-R", file_path])
        return {"message": f"{filename} revealed"}
    else:
        return {"error": "File not found"}


process_status = {}

@app.post("/process")
async def process_file(filename: str, background_tasks: BackgroundTasks):
    filepath = os.path.expanduser(f"~/opencern-datasets/data/{filename}")
    if not os.path.exists(filepath):
        return {"error": "File not found"}
    
    output_dir = os.path.expanduser("~/opencern-datasets/processed/")
    os.makedirs(output_dir, exist_ok=True)
    
    process_status[filename] = "processing"
    background_tasks.add_task(run_processor, filepath, filename)
    return {"message": "Processing started", "status": "processing"}

def run_processor(filepath: str, filename: str):
    import subprocess
    # Inside the container, we must invoke docker using the mounted socket.
    # The filepath provided to the docker run command must be from the perspective
    # of the data-processor container (which mounts /home/appuser/opencern-datasets)
    container_filepath = f"/home/appuser/opencern-datasets/data/{filename}"
    
    # We must mount the exact same host volume to the ephemeral container.
    # Note: the environment variable $HOME is not expanding the host's actual path easily 
    # when we are inside the API container. But docker-compose handles it beautifully.
    # Better yet, since opencern-processor is in docker-compose.yml as `processor`
    # and has the volume mapping defined, we can just use `docker compose run`
    # We must explicitly set the CWD to the compose file directory if possible, but
    # it's simpler to just do standard docker run and replicate the compose mount.
    # Wait, passing the actual host ${HOME} is tricky from INSIDE the API container..
    # Just run `docker run --rm -v /Users/icon/opencern-datasets:/home/appuser/opencern-datasets opencern-processor {container_filepath}`
    # Wait, hardcoding /Users/icon isn't safe. Let's use docker network. 
    # Even simpler: since the processor is defined in docker-compose as `processor`, 
    # we can try `docker run --rm --volumes-from opencern-api opencern-processor {container_filepath}` !
    
    result = subprocess.run([
        "docker", "run", "--rm", 
        "--volumes-from", "opencern-api", 
        "opencern-processor", 
        container_filepath
    ])
    
    if result.returncode == 0:
        process_status[filename] = "processed"
    else:
        process_status[filename] = "error"

@app.get("/process/status")
async def get_process_status(filename: str):
    stem = os.path.splitext(filename)[0]
    output_file = os.path.expanduser(f"~/opencern-datasets/processed/{stem}.json")
    if os.path.exists(output_file):
        return {"status": "processed"}
    
    status = process_status.get(filename, "idle")
    return {"status": status}

import json

@app.put("/process/data/{filename}")
async def save_processed_data(filename: str, request: Request):
    data = await request.json()
    stem = os.path.splitext(filename)[0]
    output_file = os.path.expanduser(f"~/opencern-datasets/processed/{stem}.json")
    with open(output_file, "w") as f:
        json.dump(data, f)
    return {"status": "saved"}

@app.delete("/process/data/{filename}")
async def delete_processed_data(filename: str):
    stem = os.path.splitext(filename)[0]
    output_file = os.path.expanduser(f"~/opencern-datasets/processed/{stem}.json")
    if os.path.exists(output_file):
        os.remove(output_file)
        return {"message": f"{stem}.json deleted"}
    return {"error": "File not found"}

# TODO 10: Run with uvicorn on port 8080
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
