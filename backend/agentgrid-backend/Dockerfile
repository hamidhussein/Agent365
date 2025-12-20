FROM python:3.10-slim

WORKDIR /code

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    netcat-openbsd \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Fix line endings and permissions for start.sh
COPY start.sh .
RUN dos2unix start.sh && chmod +x start.sh

# Expose port
# Expose port
EXPOSE 8001

# Debug: List files and run with absolute path
CMD ["bash", "start.sh"]
