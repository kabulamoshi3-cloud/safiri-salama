# Daladala ML Traffic Service

Standalone Python microservice that trains an XGBoost model on GPS speed observations
and exposes a /predict endpoint. The Node.js api-gateway NEVER depends on this service
and always falls back to the SQL-based baseline predictor if this service is unavailable.

## Prerequisites
Python >= 3.12

## Setup
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Training
```bash
python trainer.py
```

## Running
```bash
uvicorn main:app --reload --port 8001
```

## How Node calls it
POST http://localhost:8001/predict  {"segment_id": "nyerere-n-001", "departure_time": "2024-01-15T08:00:00Z"}
If unavailable (non-200 or exception), the api-gateway falls back to the SQL baseline model.
