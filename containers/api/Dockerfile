FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y curl docker.io && rm -rf /var/lib/apt/lists/*

# Set up non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install Python requirements
RUN pip install --no-cache-dir fastapi uvicorn httpx requests pydantic python-multipart aiofiles

# Copy the application code
COPY main.py .

# Change ownership
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:8080/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
