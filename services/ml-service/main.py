import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from predictor import Predictor

app = FastAPI(title="Daladala ML Traffic Service")

DATABASE_URL = os.environ.get("DATABASE_URL", "")
MODEL_PATH = os.environ.get("MODEL_PATH", "./models/traffic_speed_xgb.json")
MIN_TRAINING_SAMPLES = int(os.environ.get("MIN_TRAINING_SAMPLES", "500"))

predictor = Predictor(MODEL_PATH)

class PredictRequest(BaseModel):
    segment_id: str
    departure_time: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(req: PredictRequest):
    result = predictor.predict(req.segment_id, req.departure_time)
    if result is None:
        raise HTTPException(status_code=503, detail="Model not available; use SQL baseline")
    return result
