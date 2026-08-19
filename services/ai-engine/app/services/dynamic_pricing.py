"""
Dynamic Pricing Service

AI-based dynamic pricing algorithm
"""

from datetime import datetime
from typing import Dict, Any, Optional
import logging
import math
from .base import AIService
from ..config import settings

logger = logging.getLogger(__name__)

class DynamicPricingService(AIService):
    """AI service for dynamic pricing"""
    
    def __init__(self):
        super().__init__("dynamic_pricing")
        self.base_price_per_km = 100  # Sh per km
        self.base_price_per_min = 10  # Sh per minute
        self.max_multiplier = 2.0  # Max 2x surge
        self.min_multiplier = 0.8  # Min 0.8x discount
    
    async def calculate_price(
        self,
        distance: float,
        estimated_time: int,
        pickup_location: tuple,
        destination: tuple,
        weather: str = "clear",
        user_id: Optional[str] = None,
        trip_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculate smart dynamic price
        
        Args:
            distance: Trip distance in km
            estimated_time: Estimated time in minutes
            pickup_location: Pickup GPS coordinates
            destination: Destination GPS coordinates
            weather: Current weather
            user_id: User ID (optional)
            trip_time: Trip time (optional)
        
        Returns:
            Price calculation result
        """
        try:
            # Calculate base price
            base_price = (distance * self.base_price_per_km) + (estimated_time * self.base_price_per_min)
            
            # Calculate multipliers
            demand_mult = await self._get_demand_multiplier(pickup_location, trip_time)
            traffic_mult = await self._get_traffic_multiplier(pickup_location, destination, trip_time)
            weather_mult = self._get_weather_multiplier(weather)
            event_mult = await self._get_event_multiplier(pickup_location)
            user_mult = await self._get_user_elasticity(user_id)
            
            # Calculate final price
            final_multiplier = min(
                demand_mult * traffic_mult * weather_mult * event_mult * user_mult,
                self.max_multiplier
            )
            final_multiplier = max(final_multiplier, self.min_multiplier)
            
            final_price = int(base_price * final_multiplier)
            
            # Ensure acceptable price
            if user_id:
                final_price = await self._ensure_acceptable_price(user_id, final_price)
            
            # Log metrics
            self.log_metrics({
                "base_price": base_price,
                "final_multiplier": final_multiplier,
                "final_price": final_price
            })
            
            return {
                "price": final_price,
                "breakdown": {
                    "base_price": int(base_price),
                    "demand_multiplier": demand_mult,
                    "traffic_multiplier": traffic_mult,
                    "weather_multiplier": weather_mult,
                    "event_multiplier": event_mult,
                    "user_elasticity": user_mult,
                    "final_multiplier": final_multiplier,
                    "final_price": final_price
                },
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Price calculation failed: {str(e)}")
            raise
    
    async def _get_demand_multiplier(self, location: tuple, trip_time: Optional[datetime]) -> float:
        """Calculate demand-based multiplier"""
        try:
            # In production, query real-time demand data
            current_demand = await self._get_current_demand(location)
            available_supply = await self._get_available_drivers(location)
            
            demand_ratio = current_demand / max(available_supply, 1)
            
            if demand_ratio < 1:
                return 0.85  # Low demand discount
            elif demand_ratio < 2:
                return 1.0  # Normal
            elif demand_ratio < 5:
                return 1.5  # High demand
            else:
                return 2.0  # Very high demand
        
        except Exception as e:
            self.logger.warning(f"Demand calculation failed: {str(e)}")
            return 1.0
    
    async def _get_traffic_multiplier(self, origin: tuple, destination: tuple, trip_time: Optional[datetime]) -> float:
        """Calculate traffic-based multiplier"""
        try:
            # In production, query real-time traffic data from Google Maps or similar
            traffic_level = await self._get_traffic_level(origin, destination, trip_time)
            
            multipliers = {
                0: 1.0,      # Clear
                1: 1.2,      # Moderate
                2: 1.4,      # Heavy
                3: 1.6       # Severe
            }
            
            return multipliers.get(traffic_level, 1.0)
        
        except Exception as e:
            self.logger.warning(f"Traffic calculation failed: {str(e)}")
            return 1.0
    
    def _get_weather_multiplier(self, weather: str) -> float:
        """Get weather-based multiplier"""
        multipliers = {
            'clear': 1.0,
            'cloudy': 1.0,
            'drizzle': 1.1,
            'rain': 1.3,
            'heavy_rain': 1.5,
            'snow': 1.5,
            'storm': 1.7,
            'hail': 1.6
        }
        
        return multipliers.get(weather.lower(), 1.0)
    
    async def _get_event_multiplier(self, location: tuple) -> float:
        """Calculate multiplier for nearby events"""
        try:
            events = await self._get_nearby_events(location)
            
            if not events:
                return 1.0
            
            # Major event = higher multiplier
            max_attendance = max([e.get('expected_attendance', 0) for e in events], default=0)
            
            if max_attendance > 10000:
                return 1.5  # Concert, stadium
            elif max_attendance > 1000:
                return 1.2  # Medium event
            
            return 1.0
        
        except Exception as e:
            self.logger.warning(f"Event calculation failed: {str(e)}")
            return 1.0
    
    async def _get_user_elasticity(self, user_id: Optional[str]) -> float:
        """Calculate user price sensitivity"""
        if not user_id:
            return 1.0
        
        try:
            # In production, query user history
            cached = self.get_cached_result(f"user_elasticity:{user_id}")
            if cached:
                return float(cached)
            
            # Default to 1.0
            return 1.0
        
        except Exception as e:
            self.logger.warning(f"Elasticity calculation failed: {str(e)}")
            return 1.0
    
    async def _ensure_acceptable_price(self, user_id: str, calculated_price: int) -> int:
        """Ensure price is acceptable to user"""
        try:
            # In production, check user preferences
            max_acceptable = 9999  # Default high limit
            
            if calculated_price > max_acceptable:
                return int(max_acceptable * 0.95)
            
            return calculated_price
        
        except Exception:
            return calculated_price
    
    async def _get_current_demand(self, location: tuple) -> int:
        """Get current demand for location"""
        # Placeholder - in production, query from real-time data store
        return 10
    
    async def _get_available_drivers(self, location: tuple) -> int:
        """Get number of available drivers at location"""
        # Placeholder - in production, query from database
        return 5
    
    async def _get_traffic_level(self, origin: tuple, destination: tuple, trip_time: Optional[datetime]) -> int:
        """Get traffic level (0=clear, 1=moderate, 2=heavy, 3=severe)"""
        # Placeholder - in production, query Google Maps or similar
        return 1
    
    async def _get_nearby_events(self, location: tuple) -> list:
        """Get nearby events"""
        # Placeholder - in production, query events database
        return []
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process pricing request"""
        return await self.calculate_price(*args, **kwargs)
