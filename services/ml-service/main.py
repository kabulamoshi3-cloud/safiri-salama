"""
FastAPI app for traffic speed prediction using trained XGBoost model.
"""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from predictor import TrafficPredictor
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DalaSmart ML Service", version="1.0.0")

# Initialize predictor
MODEL_PATH = os.getenv("MODEL_PATH", "model.pkl")
predictor = TrafficPredictor(MODEL_PATH)


class PredictionRequest(BaseModel):
    segment_id: str
    departure_time: str  # ISO 8601 format


class PredictionResponse(BaseModel):
    segment_id: str
    predicted_speed_kmh: float
    confidence: float
    model_type: str


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "model_loaded": predictor.model_loaded}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict traffic speed for a given segment and departure time.
    
    If the model is not loaded (insufficient training data or model file missing),
    returns a fallback prediction with low confidence.
    """
    try:
        result = predictor.predict(request.segment_id, request.departure_time)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
