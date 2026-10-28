FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /workspace

COPY tools/requirements-price-estimator.txt /tmp/requirements-price-estimator.txt
RUN pip install --no-cache-dir -r /tmp/requirements-price-estimator.txt

COPY tools/price_estimator.py /app/price_estimator.py

ENTRYPOINT ["python", "/app/price_estimator.py"]