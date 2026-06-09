FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required (e.g., for specific python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose the API port
EXPOSE 8001

# Command to run the application
CMD ["python", "server.py"]
