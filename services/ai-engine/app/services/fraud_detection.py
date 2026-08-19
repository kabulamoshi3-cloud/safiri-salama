"""
Fraud Detection Service

Uses Random Forest model to detect fraudulent transactions
"""

from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import logging
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import pandas as pd
from .base import AIService
from ..config import settings

logger = logging.getLogger(__name__)

class FraudDetectionService(AIService):
    """AI service for fraud detection"""
    
    def __init__(self):
        super().__init__("fraud_detection")
        self.scaler = StandardScaler()
        self.load_or_init_model()
        self.fraud_threshold = settings.FRAUD_THRESHOLD
        self.feature_names = [
            'account_age_days',
            'new_device',
            'new_location',
            'location_jump_distance',
            'payment_method_change',
            'amount_variance',
            'time_since_last_transaction',
            'device_fingerprint_match',
            'ip_reputation_score',
            'similar_to_known_fraud'
        ]
    
    def load_or_init_model(self):
        """Load existing model or initialize new one"""
        try:
            self.model = joblib.load(settings.FRAUD_MODEL_PATH)
            self.scaler = joblib.load(settings.FRAUD_MODEL_PATH.replace('.pkl', '_scaler.pkl'))
            self.logger.info("Loaded existing fraud detection model")
        except Exception as e:
            self.logger.info(f"Initializing new fraud detection model: {str(e)}")
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                random_state=42,
                n_jobs=-1,
                min_samples_split=10,
                min_samples_leaf=5,
                class_weight='balanced'  # Handle class imbalance
            )
            # Fit scaler with dummy data for demo
            dummy_data = np.array([[
                30, 0, 0, 100, 0, 1.0, 3600, 0.9, 0.9, 0.1
            ] for _ in range(10)])
            self.scaler.fit(dummy_data)
            self.model.fit(dummy_data, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
    
    async def detect_fraud(
        self,
        user_id: str,
        trip_id: str,
        user_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect if user is fraudulent
        
        Args:
            user_id: User ID
            trip_id: Trip ID
            user_data: User data dictionary
        
        Returns:
            Fraud detection result
        """
        try:
            # Validate input
            self.validate_input(user_data, self.feature_names)
            
            # Extract features
            features = self._extract_features(user_data)
            
            # Scale features
            features_scaled = self.scaler.transform([features])
            
            # Predict fraud probability
            fraud_probability = self.model.predict_proba(features_scaled)[0][1]
            
            # Determine risk level
            risk_level = self._get_risk_level(fraud_probability)
            
            # Determine action
            action = self._get_action(fraud_probability, risk_level, user_data)
            
            # Log metrics
            self.log_metrics({
                "fraud_score": fraud_probability,
                "risk_level": risk_level
            })
            
            # Cache result
            cache_key = f"fraud:{user_id}:{trip_id}"
            self.cache_result(cache_key, fraud_probability, ttl=3600)
            
            return {
                "user_id": user_id,
                "trip_id": trip_id,
                "fraud_score": float(fraud_probability),
                "risk_level": risk_level,
                "action": action["action"],
                "reason": action["reason"],
                "verification_required": action.get("verification_methods"),
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Fraud detection failed: {str(e)}")
            raise
    
    def _extract_features(self, user_data: Dict[str, Any]) -> list:
        """Extract features from user data"""
        return [
            user_data['account_age_days'],
            float(user_data['new_device']),
            float(user_data['new_location']),
            user_data['location_jump_distance'],
            float(user_data['payment_method_change']),
            user_data['amount_variance'],
            user_data['time_since_last_transaction'],
            user_data['device_fingerprint_match'],
            user_data['ip_reputation_score'],
            user_data['similar_to_known_fraud']
        ]
    
    def _get_risk_level(self, fraud_probability: float) -> str:
        """Determine risk level from fraud probability"""
        if fraud_probability < 0.3:
            return "low"
        elif fraud_probability < 0.7:
            return "medium"
        else:
            return "high"
    
    def _get_action(self, fraud_probability: float, risk_level: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Determine action based on fraud score"""
        
        # Check user history (simplified - in production, query from DB)
        user_history = self._get_user_history(user_data.get('user_id'))
        
        if risk_level == "low":
            return {
                "action": "ALLOW",
                "reason": "Low fraud risk"
            }
        
        elif risk_level == "medium":
            # Check if loyal user
            if user_history.get('trip_count', 0) > 20 and user_history.get('avg_rating', 0) > 4.5:
                return {
                    "action": "ALLOW",
                    "reason": "Medium fraud risk, but loyal user"
                }
            else:
                return {
                    "action": "VERIFY",
                    "reason": "Additional verification required",
                    "verification_methods": ["sms", "email", "security_question"]
                }
        
        else:  # high risk
            return {
                "action": "BLOCK",
                "reason": f"High fraud risk detected (score: {fraud_probability:.2%})"
            }
    
    def _get_user_history(self, user_id: Optional[str]) -> Dict[str, Any]:
        """Get user history from cache or DB"""
        if not user_id:
            return {}
        
        # Try cache first
        cached = self.get_cached_result(f"user_history:{user_id}")
        if cached:
            return eval(cached)
        
        # In production, query from database
        return {
            "trip_count": 0,
            "avg_rating": 0,
            "fraud_flags": 0
        }
    
    async def train_model(self, training_data: Optional[str] = None) -> str:
        """
        Train fraud detection model
        
        Args:
            training_data: Path to training CSV or None for default
        
        Returns:
            Training status message
        """
        try:
            # Load training data
            if training_data:
                df = pd.read_csv(training_data)
            else:
                df = self._get_training_data()
            
            if df is None or df.empty:
                return "No training data available"
            
            # Prepare features and target
            X = df[self.feature_names]
            y = df['is_fraud']
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.model.fit(X_scaled, y)
            
            # Save model
            joblib.dump(self.model, settings.FRAUD_MODEL_PATH)
            joblib.dump(self.scaler, settings.FRAUD_MODEL_PATH.replace('.pkl', '_scaler.pkl'))
            
            self.logger.info(f"Fraud model trained with {len(df)} samples")
            
            return f"Model trained successfully on {len(df)} samples"
        
        except Exception as e:
            self.logger.error(f"Model training failed: {str(e)}")
            raise
    
    def _get_training_data(self) -> Optional[pd.DataFrame]:
        """Get training data from database"""
        # In production, query from database
        # For now, return None
        return None
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from model"""
        if not self.model:
            return {}
        
        importances = self.model.feature_importances_
        return {
            name: float(importance)
            for name, importance in zip(self.feature_names, importances)
        }
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process fraud detection request"""
        return await self.detect_fraud(*args, **kwargs)
