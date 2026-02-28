"""
OpenCERN API — Configuration & Constants
"""
import os

# Paths
DATA_DIR = os.path.expanduser("~/opencern-datasets/data/")
PROCESSED_DIR = os.path.expanduser("~/opencern-datasets/processed/")

# CERN Open Data API
CERN_API_BASE = "https://opendata.cern.ch/api/records/"

# Cache TTL (seconds)
CATALOG_CACHE_TTL = 300  # 5 minutes

# Download
MAX_DOWNLOAD_WORKERS = 8
DOWNLOAD_CHUNK_SIZE = 131072  # 128KB chunks for faster I/O
MAX_DOWNLOAD_RETRIES = 10
DOWNLOAD_TIMEOUT = 60

# Ensure directories exist on startup
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
