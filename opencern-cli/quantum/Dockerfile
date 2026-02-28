FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install core dependencies
RUN pip install --no-cache-dir \
    qiskit>=1.0.0 \
    qiskit-aer>=0.13.0 \
    fastapi>=0.110.0 \
    uvicorn[standard]>=0.27.0 \
    numpy>=1.26.0 \
    scikit-learn>=1.4.0 \
    pandas>=2.2.0 \
    pydantic>=2.0.0

# IBM Quantum (optional)
RUN pip install --no-cache-dir qiskit-ibm-runtime>=0.20.0 || true

# Copy application
COPY vqc_classifier.py .

# Non-root user for security
RUN useradd -m -u 1000 quantum
USER quantum

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8082/health')" || exit 1

CMD ["uvicorn", "vqc_classifier:app", "--host", "0.0.0.0", "--port", "8082", "--workers", "1"]
