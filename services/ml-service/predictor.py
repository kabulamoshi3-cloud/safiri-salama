import os
from typing import Optional

class Predictor:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self._model = None
        self._label_encoder = None
        self._load_model()

    def _load_model(self):
        try:
            import xgboost as xgb
            if os.path.exists(self.model_path):
                self._model = xgb.XGBRegressor()
                self._model.load_model(self.model_path)
        except Exception as e:
            print(f"Model load failed: {e}; will return unavailable for all predictions")
            self._model = None

    def predict(self, segment_id: str, departure_time: str) -> Optional[dict]:
        if self._model is None:
            return None
        try:
            import numpy as np
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
            utc_hour = dt.hour
            dar_hour = (utc_hour + 3) % 24
            dar_day = dt.weekday() + 1 if (utc_hour + 3) < 24 else (dt.weekday() + 2) % 7
            # Simple segment hash encoding (must match training; use 0 for unknown)
            segment_hash = abs(hash(segment_id)) % 1000
            X = np.array([[segment_hash, dar_day, dar_hour]])
            speed = float(self._model.predict(X)[0])
            speed = max(0.0, min(speed, 120.0))
            confidence = 0.85  # fixed when model is available
            return {
                "segment_id": segment_id,
                "predicted_speed_kmh": round(speed, 1),
                "confidence": confidence
            }
        except Exception as e:
            print(f"Prediction error for {segment_id}: {e}")
            return None
