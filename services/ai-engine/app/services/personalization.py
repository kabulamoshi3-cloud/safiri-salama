"""
Personalization Service

Handles user profiling and AI-based recommendations
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
import logging
import numpy as np
from .base import AIService

logger = logging.getLogger(__name__)

class PersonalizationService(AIService):
    """AI service for personalization"""
    
    def __init__(self):
        super().__init__("personalization")
        self.user_profiles = {}
    
    async def recommend_driver(
        self,
        user_id: str,
        available_drivers: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Recommend best driver for user
        
        Args:
            user_id: User ID
            available_drivers: List of available drivers
        
        Returns:
            Recommendation result
        """
        try:
            if not available_drivers:
                return {
                    "user_id": user_id,
                    "recommended_driver": None,
                    "reason": "No drivers available"
                }
            
            # Get user profile
            user_profile = await self.get_or_create_profile(user_id)
            
            # Score drivers
            driver_scores = {}
            for driver in available_drivers:
                score = self._calculate_driver_score(user_profile, driver)
                driver_scores[driver['id']] = score
            
            # Get best driver
            best_driver_id = max(driver_scores, key=driver_scores.get)
            best_driver = next(d for d in available_drivers if d['id'] == best_driver_id)
            
            return {
                "user_id": user_id,
                "recommended_driver": best_driver,
                "score": driver_scores[best_driver_id],
                "all_scores": driver_scores,
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Driver recommendation failed: {str(e)}")
            raise
    
    async def predict_destination(
        self,
        user_id: str,
        pickup_location: tuple
    ) -> Optional[str]:
        """
        Predict user's destination
        
        Args:
            user_id: User ID
            pickup_location: Current pickup location
        
        Returns:
            Predicted destination or None
        """
        try:
            # Get user profile
            user_profile = await self.get_or_create_profile(user_id)
            
            # Get common routes from pickup location
            common_routes = user_profile.get('preferred_routes', [])
            
            if not common_routes:
                return None
            
            # Find similar routes
            similar_routes = [
                r for r in common_routes
                if self._calculate_distance(pickup_location, r['origin']) < 1000
            ]
            
            if not similar_routes:
                return None
            
            # Return most common destination
            best_route = max(similar_routes, key=lambda r: r.get('frequency', 0))
            return best_route.get('destination')
        
        except Exception as e:
            self.logger.error(f"Destination prediction failed: {str(e)}")
            return None
    
    async def get_ui_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get personalized UI preferences"""
        try:
            profile = await self.get_or_create_profile(user_id)
            
            return {
                "user_id": user_id,
                "theme": profile.get('theme', 'light'),
                "language": profile.get('language', 'en'),
                "text_size": profile.get('text_size', 'medium'),
                "font_family": profile.get('font_family', 'default'),
                "high_contrast": profile.get('high_contrast', False),
                "accessibility_options": profile.get('accessibility_options', {}),
                "quick_actions": profile.get('quick_actions', []),
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Failed to get UI preferences: {str(e)}")
            raise
    
    async def get_or_create_profile(self, user_id: str) -> Dict[str, Any]:
        """Get or create user profile"""
        # Check cache first
        cached = self.get_cached_result(f"profile:{user_id}")
        if cached:
            return eval(cached)
        
        # In production, load from database
        profile = self.user_profiles.get(user_id, {
            "user_id": user_id,
            "theme": "light",
            "language": "en",
            "text_size": "medium",
            "font_family": "default",
            "high_contrast": False,
            "accessibility_options": {},
            "quick_actions": [],
            "preferred_drivers": [],
            "preferred_routes": [],
            "created_at": datetime.now().isoformat()
        })
        
        self.user_profiles[user_id] = profile
        self.cache_result(f"profile:{user_id}", profile, ttl=3600)
        
        return profile
    
    def _calculate_driver_score(self, user_profile: Dict[str, Any], driver: Dict[str, Any]) -> float:
        """Calculate score for driver given user preferences"""
        score = 0
        
        # Preference matching (30%)
        if driver.get('id') in user_profile.get('preferred_drivers', []):
            score += 30
        else:
            score += 20  # New driver
        
        # Rating (35%)
        rating = driver.get('rating', 4.0)
        score += (rating / 5) * 35
        
        # Specialization (20%)
        driver_spec = driver.get('specialization', 'general')
        user_spec = user_profile.get('trip_type', 'general')
        if driver_spec == user_spec:
            score += 20
        elif driver_spec == 'general':
            score += 15
        
        # Safety record (15%)
        incidents = driver.get('incident_count', 0)
        safety_score = max(0, 1 - (incidents / 100))
        score += safety_score * 15
        
        return score
    
    def _calculate_distance(self, loc1: tuple, loc2: tuple) -> float:
        """Calculate distance between two locations in meters"""
        try:
            from math import radians, sin, cos, sqrt, atan2
            
            R = 6371000  # Earth's radius in meters
            
            lat1, lon1 = loc1
            lat2, lon2 = loc2
            
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            
            a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            
            return R * c
        
        except Exception:
            return 0
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process personalization request"""
        return await self.recommend_driver(*args, **kwargs)
