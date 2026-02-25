# TODO: Quantum Service Dockerfile
#
# Builds the quantum computing container for OpenCERN.
# Runs a FastAPI server that wraps Qiskit quantum circuits.
#
# Base image: Python 3.11 slim
# Exposes: port 8082
# Entry: uvicorn vqc_classifier:app --host 0.0.0.0 --port 8082
#
# Build steps:
#   1. Install Python dependencies from requirements.txt
#   2. Copy quantum circuit code
#   3. Copy pre-trained VQC weights (if any)
#   4. Start FastAPI server
#
# Note: This container is only started when /quantum is used.
# It is NOT part of the default docker compose up.
