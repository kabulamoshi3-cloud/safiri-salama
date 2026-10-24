"""
Traffic speed predictor using trained XGBoost model.
"""
import os
import pickle
from datetime import datetime
from typing import Dict

# Known segment IDs from migration 016 seed data
KNOWN_SEGMENTS = [
    'nyerere-n-001', 'nyerere-s-001', 'morogoro-001', 'morogoro-002',
    'sam-nujoma-001', 'bagamoyo-001', 'ali-mwinyi-001', 'mandela-001',
    'kilwa-001', 'pugu-001', 'bibi-titi-001', 'kivukoni-001'
]


class TrafficPredictor:
    """Loads trained model and makes predictions."""
    
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.label_encoder = None
        self.model_loaded = False
        self._load_model()
    
    def _load_model(self):
        """Load model and label encoder from disk."""
        if not os.path.exists(self.model_path):
            print(f"Model file not found: {self.model_path}")
            print("Predictor will return fallback predictions.")
            return
        
        try:
            with open(self.model_path, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.label_encoder = data['label_encoder']
                self.model_loaded = True
                print(f"Model loaded from {self.model_path}")
        except Exception as e:
            print(f"Failed to load model: {e}")
    
    def predict(self, segment_id: str, departure_time: str) -> Dict:
        """
        Predict speed for a segment at a given time.
        
        Args:
            segment_id: Road segment ID (e.g., 'nyerere-n-001')
            departure_time: ISO 8601 datetime string
        
        Returns:
            Dict with keys: segment_id, predicted_speed_kmh, confidence, model_type
        """
        # Parse departure time to get day_of_week and hour_of_day (in EAT = UTC+3)
        dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
        # Convert to EAT
        eat_hour = (dt.hour + 3) % 24
        eat_day = dt.weekday()  # Monday=0, Sunday=6
        if dt.hour + 3 >= 24:
            eat_day = (eat_day + 1) % 7
        
        # If model not loaded, return fallback
        if not self.model_loaded:
            return {
                'segment_id': segment_id,
                'predicted_speed_kmh': 35.0,
                'confidence': 0.2,
                'model_type': 'fallback'
            }
        
        # Encode segment_id
        if segment_id not in self.label_encoder.classes_:
            # Unknown segment
            return {
                'segment_id': segment_id,
                'predicted_speed_kmh': 40.0,
                'confidence': 0.1,
                'model_type': 'unknown_segment'
            }
        
        segment_encoded = self.label_encoder.transform([segment_id])[0]
        
        # Predict
        X = [[eat_day, eat_hour, segment_encoded]]
        predicted_speed = float(self.model.predict(X)[0])
        
        # Clamp to realistic range
        predicted_speed = max(5.0, min(80.0, predicted_speed))
        
        # Confidence heuristic (simplified)
        confidence = 0.75  # Could be computed from model uncertainty if available
        
        return {
            'segment_id': segment_id,
            'predicted_speed_kmh': round(predicted_speed, 1),
            'confidence': confidence,
            'model_type': 'ml'
        }
