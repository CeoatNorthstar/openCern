"""
OpenCERN API — Pydantic Models
"""
from pydantic import BaseModel
from typing import List


class Dataset(BaseModel):
    id: str
    title: str
    description: str
    files: List[str]
    size: str
    year: int


class DownloadStatus(BaseModel):
    filename: str
    status: str  # pending, downloading, done, error, cancelled
    progress: float  # 0-100
