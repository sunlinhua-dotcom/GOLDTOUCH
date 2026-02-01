
# Python Quant Core Dockerfile
FROM python:3.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TZ=Asia/Shanghai

WORKDIR /app

# Install system dependencies (required for TradingAgents report generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    fontconfig \
    fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Pandoc (for report export)
RUN wget -q https://github.com/jgm/pandoc/releases/download/3.1.11.1/pandoc-3.1.11.1-1-amd64.deb && \
    dpkg -i pandoc-3.1.11.1-1-amd64.deb && \
    rm pandoc-3.1.11.1-1-amd64.deb

# Copy dependency files first
COPY requirements.txt pyproject.toml ./

# Install Python dependencies
# Increase timeout and use mirror if needed
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install fastapi uvicorn

# Copy application code
COPY . .

# Expose API port
EXPOSE 8000

# Start API
CMD ["python", "api.py"]
