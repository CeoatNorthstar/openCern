# ──────────────────────────────────────────────────────────────
# OpenCERN C++ Processor — Multi-stage Docker Build
# Uses official ROOT Docker image for C++ ROOT libraries
# ──────────────────────────────────────────────────────────────

# Stage 1: Build
FROM rootproject/root:6.32.02-ubuntu24.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY CMakeLists.txt .
COPY src/ src/

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j$(nproc) \
    && cmake --install build --prefix /install

# Stage 2: Runtime (smaller image)
FROM rootproject/root:6.32.02-ubuntu24.04

RUN useradd -m appuser
COPY --from=builder /install/bin/opencern-processor /usr/local/bin/opencern-processor

USER appuser
WORKDIR /home/appuser

ENTRYPOINT ["opencern-processor"]
