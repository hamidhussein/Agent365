FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for some python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy and set permissions for start script
COPY start.sh .
RUN chmod +x start.sh

# Expose the port
EXPOSE 8001

# Run the application
CMD ["./start.sh"]
