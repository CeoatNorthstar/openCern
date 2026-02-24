"""
OpenCERN API — Enterprise FastAPI Backend
==========================================
Fully async, modular, and fast.

Architecture:
  main.py          → App factory + middleware + startup
  config.py        → Constants & paths
  models.py        → Pydantic schemas
  routers/         → Route handlers (datasets, downloads, files, processing)
  services/        → Business logic (catalog, downloader)
"""
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from routers import datasets, downloads, files, processing

# ──────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("opencern.api")

# ──────────────────────────────────────────────────────────────────
# App Factory
# ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OpenCERN API",
    version="2.0.0",
    description="Enterprise-grade physics data gateway",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────
# Middleware: Request Timing
# ──────────────────────────────────────────────────────────────────
@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time-Ms"] = f"{elapsed:.1f}"
    if elapsed > 100:
        log.warning(f"SLOW {request.method} {request.url.path} — {elapsed:.0f}ms")
    return response


# ──────────────────────────────────────────────────────────────────
# Health Check (must be on the root app, not a router)
# ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ──────────────────────────────────────────────────────────────────
# Register Routers
# ──────────────────────────────────────────────────────────────────
app.include_router(datasets.router)
app.include_router(downloads.router)
app.include_router(files.router)
app.include_router(processing.router)


# ──────────────────────────────────────────────────────────────────
# Startup
# ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    log.info("╔══════════════════════════════════════════════════════╗")
    log.info("║  OpenCERN API v2.0 — Online                        ║")
    log.info("╚══════════════════════════════════════════════════════╝")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
