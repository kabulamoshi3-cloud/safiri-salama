"""
Demand Forecasting Service

LSTM-based demand and pricing forecasting
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging
import numpy as np
from .base import AIService

logger = logging.getLogger(__name__)

class DemandForecastingService(AIService):
    """AI service for demand forecasting"""
    
    def __init__(self):
        super().__init__("demand_forecasting")
        self.lstm_model = self._init_lstm_model()
        self.historical_data = {}
    
    def _init_lstm_model(self):
        """Initialize LSTM model"""
        try:
            from tensorflow import keras
            # Load pre-trained model or create new one
            return keras.Sequential([
                keras.layers.LSTM(128, input_shape=(24, 5)),  # 24 hours of data, 5 features
                keras.layers.Dropout(0.2),
                keras.layers.Dense(64, activation='relu'),
                keras.layers.Dense(1, activation='relu')
            ])
        except Exception as e:
            self.logger.warning(f"Failed to initialize LSTM model: {str(e)}")
            return None
    
    async def forecast_demand(self, location: tuple, hours_ahead: int = 1) -> Dict[str, Any]:
        """
        Forecast demand for location
        
        Args:
            location: Location coordinates (lat, lon)
            hours_ahead: Hours to forecast ahead (1-24)
        
        Returns:
            Demand forecast
        """
        try:
            hours_ahead = min(max(hours_ahead, 1), 24)  # Clamp to 1-24
            
            # Get historical data for location
            historical = await self._get_historical_demand(location)
            
            # Prepare features
            features = self._prepare_features(historical, hours_ahead)
            
            # Forecast demand
            if self.lstm_model:
                forecast = self.lstm_model.predict(features, verbose=0)[0][0]
            else:
                forecast = self._fallback_forecast(historical, hours_ahead)
            
            # Generate hourly forecast
            hourly_forecast = await self._generate_hourly_forecast(location, hours_ahead, forecast)
            
            return {
                "location": location,
                "forecast_hours": hours_ahead,
                "predicted_demand": int(forecast),
                "hourly_breakdown": hourly_forecast,
                "confidence": 0.78,
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Demand forecasting failed: {str(e)}")
            raise
    
    async def forecast_pricing(self, hours_ahead: int = 1) -> Dict[str, Any]:
        """
        Forecast pricing trends
        
        Args:
            hours_ahead: Hours to forecast ahead
        
        Returns:
            Pricing forecast
        """
        try:
            hours_ahead = min(max(hours_ahead, 1), 24)
            
            # Get historical pricing data
            historical_prices = await self._get_historical_prices()
            
            # Forecast prices
            forecasted_prices = []
            for i in range(hours_ahead):
                future_time = datetime.now() + timedelta(hours=i+1)
                trend = self._calculate_price_trend(historical_prices, future_time)
                forecasted_prices.append(trend)
            
            return {
                "forecast_hours": hours_ahead,
                "hourly_prices": forecasted_prices,
                "average_multiplier": np.mean([t['multiplier'] for t in forecasted_prices]),
                "peak_hour": self._find_peak_hour(forecasted_prices),
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Pricing forecasting failed: {str(e)}")
            raise
    
    async def _get_historical_demand(self, location: tuple) -> List[Dict[str, Any]]:
        """Get historical demand data for location"""
        cache_key = f"demand_history:{location}"
        cached = self.get_cached_result(cache_key)
        
        if cached:
            return eval(cached)
        
        # In production, query from time-series database
        # Generate synthetic data for demo
        historical = []
        now = datetime.now()
        
        for i in range(24):
            hour_ago = now - timedelta(hours=i+1)
            historical.append({
                "timestamp": hour_ago,
                "demand": np.random.randint(5, 50),
                "supply": np.random.randint(5, 30),
                "price_multiplier": np.random.uniform(0.8, 2.0)
            })
        
        self.cache_result(cache_key, historical, ttl=3600)
        return historical
    
    async def _get_historical_prices(self) -> List[Dict[str, Any]]:
        """Get historical pricing data"""
        # In production, query from database
        historical = []
        now = datetime.now()
        
        for i in range(24):
            hour_ago = now - timedelta(hours=i+1)
            historical.append({
                "timestamp": hour_ago,
                "multiplier": np.random.uniform(0.8, 2.0),
                "base_price": 1500,
                "final_price": int(1500 * np.random.uniform(0.8, 2.0))
            })
        
        return historical
    
    def _prepare_features(self, historical: List[Dict[str, Any]], hours_ahead: int) -> np.ndarray:
        """Prepare features for LSTM"""
        # Extract features from historical data
        features = []
        for item in historical:
            features.append([
                item['demand'],
                item['supply'],
                item['price_multiplier'],
                item['timestamp'].hour,
                item['timestamp'].weekday()
            ])
        
        # Reshape for LSTM
        return np.array([features[-24:]])
    
    def _fallback_forecast(self, historical: List[Dict[str, Any]], hours_ahead: int) -> float:
        """Fallback forecast method"""
        # Simple moving average
        demands = [h['demand'] for h in historical[-12:]]
        return np.mean(demands) * (1 + hours_ahead / 24)
    
    async def _generate_hourly_forecast(
        self,
        location: tuple,
        hours_ahead: int,
        total_forecast: float
    ) -> List[Dict[str, Any]]:
        """Generate hour-by-hour forecast"""
        hourly = []
        now = datetime.now()
        
        for i in range(hours_ahead):
            future_time = now + timedelta(hours=i+1)
            # Distribute forecast across hours based on time patterns
            hour_demand = total_forecast / hours_ahead * (1 + np.sin(future_time.hour / 24 * 2 * np.pi) * 0.3)
            
            hourly.append({
                "time": future_time,
                "predicted_demand": int(hour_demand),
                "confidence": 0.75 - (i * 0.03)  # Confidence decreases further ahead
            })
        
        return hourly
    
    def _calculate_price_trend(self, historical: List[Dict[str, Any]], future_time: datetime) -> Dict[str, Any]:
        """Calculate price trend for a future time"""
        # Get average multiplier for this hour of day
        hour = future_time.hour
        same_hour_prices = [
            h['multiplier'] for h in historical
            if h['timestamp'].hour == hour
        ]
        
        if same_hour_prices:
            avg_multiplier = np.mean(same_hour_prices)
        else:
            avg_multiplier = 1.0
        
        base_price = 1500
        final_price = int(base_price * avg_multiplier)
        
        return {
            "time": future_time,
            "base_price": base_price,
            "multiplier": avg_multiplier,
            "final_price": final_price
        }
    
    def _find_peak_hour(self, hourly_prices: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Find peak hour in forecast"""
        if not hourly_prices:
            return None
        
        return max(hourly_prices, key=lambda x: x['final_price'])
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process forecasting request"""
        return await self.forecast_demand(*args, **kwargs)
