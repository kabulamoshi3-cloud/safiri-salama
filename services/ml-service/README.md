# Safiri Haraka ML Service

Python-based ML microservice for traffic speed prediction using XGBoost.

## ⚠️ Important

This service is **optional**. The Node.js API Gateway (`services/api-gateway`) implements a **baseline rule-based predictor** that always works without this service. The ML service is provided for future enhancement and training on real data — the gateway will never depend on it.

## Setup

### Prerequisites
- Python 3.9+
- PostgreSQL (same database as api-gateway)
- Virtual environment (venv)

### Installation

```bash
cd services/ml-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to match api-gateway
```

## Training

Train the XGBoost model on real GPS observations:

```bash
source venv/bin/activate
python trainer.py
```

The trainer:
1. Connects to PostgreSQL via `DATABASE_URL`
2. Reads `segment_speed_observations` table
3. Checks row count against `MIN_TRAINING_SAMPLES` (default: 500)
4. If sufficient data: trains an XGBoost regressor with features `[day_of_week, hour_of_day, segment_id_encoded]`
5. Saves the trained model to `MODEL_PATH` (default: `model.pkl`)
6. If insufficient data: prints a warning and exits (no model file created)

## Running

Start the FastAPI server:

```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001
```

Server runs on http://localhost:8001

### Endpoints

- `GET /health` — health check, returns `{"status": "ok"}`
- `POST /predict` — body: `{"segment_id": "nyerere-n-001", "departure_time": "2024-10-25T10:30:00+03:00"}`, returns `{"segment_id", "predicted_speed_kmh", "confidence"}`

## Integration with Node.js Gateway

The Node.js API Gateway (`services/api-gateway`) does **not** call this service by default. It uses the baseline rule-based predictor (always available).

To enable ML predictions in the gateway (future enhancement):
1. Set `ML_SERVICE_URL=http://localhost:8001` in `services/api-gateway/.env`
2. Update `TrafficPredictor.ts` to call the ML service endpoint when available, fallback to baseline rules on error

## Directory Structure

```
services/ml-service/
├── README.md
├── requirements.txt      # Python dependencies
├── .env.example         # Environment template
├── main.py              # FastAPI app
├── trainer.py           # XGBoost training script
├── predictor.py         # Model loading + inference
└── model.pkl            # Trained model (created by trainer.py)
```

## Environment Variables

See `.env.example` for all required variables.

## Troubleshooting

**"No module named 'psycopg2'"**  
→ Run `pip install -r requirements.txt` inside the venv

**"Training data insufficient (X < MIN_TRAINING_SAMPLES)"**  
→ Normal when the system is new. The gateway uses baseline rules until enough GPS observations accumulate.

**"Cannot connect to database"**  
→ Check `DATABASE_URL` in `.env`. It must match the PostgreSQL instance used by `api-gateway`.

**"Model file not found"**  
→ Run `python trainer.py` first. If training data is insufficient, the predictor falls back to a simple average (or you can disable the service — the gateway never requires it).
