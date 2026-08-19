"""
Threat Detection Service

Real-time safety monitoring during trips
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
import math
from .base import AIService

logger = logging.getLogger(__name__)

class ThreatDetectionService(AIService):
    """AI service for real-time threat detection"""
    
    def __init__(self):
        super().__init__("threat_detection")
        self.speed_limit = 120  # km/h
        self.deviation_threshold = 500  # meters
    
    async def detect_threat(
        self,
        trip_id: str,
        driver_id: str,
        user_id: str,
        current_location: tuple,
        driver_location: tuple,
        trip_route: List[tuple],
        speed: float,
        timestamp: datetime
    ) -> Dict[str, Any]:
        """
        Detect safety threats during trip
        
        Args:
            trip_id: Trip ID
            driver_id: Driver ID
            user_id: User ID
            current_location: Passenger's location
            driver_location: Driver's current location
            trip_route: Planned route
            speed: Current speed
            timestamp: Current timestamp
        
        Returns:
            Threat detection result
        """
        try:
            threats = []
            
            # Check for speeding
            if speed > self.speed_limit:
                threats.append({
                    "type": "SPEEDING",
                    "severity": self._calculate_severity(speed, self.speed_limit),
                    "details": f"Speed {speed} km/h exceeds limit {self.speed_limit} km/h"
                })
            
            # Check for route deviation
            route_deviation = await self._check_route_deviation(
                driver_location, trip_route
            )
            if route_deviation['is_deviated']:
                threats.append({
                    "type": "ROUTE_DEVIATION",
                    "severity": route_deviation['severity'],
                    "details": f"Driver deviated {route_deviation['distance']}m from route"
                })
            
            # Check for suspicious behavior
            behavior_threat = await self._check_suspicious_behavior(
                trip_id, driver_id, user_id
            )
            if behavior_threat:
                threats.append(behavior_threat)
            
            # Check distance between passenger and driver
            distance_threat = await self._check_passenger_driver_distance(
                current_location, driver_location
            )
            if distance_threat:
                threats.append(distance_threat)
            
            # Determine overall threat status
            threat_detected = len(threats) > 0
            overall_severity = max([t['severity'] for t in threats], default=None)
            recommended_action = self._get_recommended_action(threats)
            
            # Log metrics
            if threat_detected:
                self.log_metrics({
                    "threat_count": len(threats),
                    "severity": overall_severity or "none"
                })
            
            return {
                "trip_id": trip_id,
                "threat_detected": threat_detected,
                "threat_type": threats[0]['type'] if threats else None,
                "threats": threats,
                "severity": overall_severity,
                "recommended_action": recommended_action,
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Threat detection failed: {str(e)}")
            raise
    
    async def _check_route_deviation(
        self,
        current_location: tuple,
        planned_route: List[tuple]
    ) -> Dict[str, Any]:
        """Check if driver deviated from planned route"""
        try:
            if not planned_route or len(planned_route) < 2:
                return {"is_deviated": False, "distance": 0, "severity": "none"}
            
            # Calculate minimum distance to route
            min_distance = float('inf')
            for i in range(len(planned_route) - 1):
                segment_distance = self._distance_to_segment(
                    current_location,
                    planned_route[i],
                    planned_route[i + 1]
                )
                min_distance = min(min_distance, segment_distance)
            
            is_deviated = min_distance > self.deviation_threshold
            severity = self._get_severity_level(min_distance, self.deviation_threshold * 3)
            
            return {
                "is_deviated": is_deviated,
                "distance": min_distance,
                "severity": severity
            }
        
        except Exception as e:
            self.logger.warning(f"Route deviation check failed: {str(e)}")
            return {"is_deviated": False, "distance": 0, "severity": "none"}
    
    async def _check_suspicious_behavior(
        self,
        trip_id: str,
        driver_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Check for suspicious driver or user behavior"""
        try:
            # Check driver history
            driver_flags = await self._get_driver_flags(driver_id)
            
            if driver_flags['harassment_complaints'] > 3:
                return {
                    "type": "SUSPICIOUS_DRIVER",
                    "severity": "high",
                    "details": f"Driver has {driver_flags['harassment_complaints']} harassment complaints"
                }
            
            if driver_flags['cancellation_rate'] > 0.5:
                return {
                    "type": "SUSPICIOUS_DRIVER",
                    "severity": "medium",
                    "details": "Driver has high cancellation rate"
                }
            
            # Check user history
            user_flags = await self._get_user_flags(user_id)
            
            if user_flags['fraud_attempts'] > 2:
                return {
                    "type": "SUSPICIOUS_USER",
                    "severity": "high",
                    "details": "User has fraud history"
                }
            
            return None
        
        except Exception as e:
            self.logger.warning(f"Suspicious behavior check failed: {str(e)}")
            return None
    
    async def _check_passenger_driver_distance(
        self,
        passenger_location: tuple,
        driver_location: tuple
    ) -> Optional[Dict[str, Any]]:
        """Check distance between passenger and driver"""
        try:
            distance = self._distance(passenger_location, driver_location)
            
            # During trip, driver should be relatively close
            if distance > 2:  # 2 km
                return {
                    "type": "DISTANCE_ANOMALY",
                    "severity": "medium",
                    "details": f"Driver is {distance:.1f} km away from passenger"
                }
            
            return None
        
        except Exception:
            return None
    
    def _distance(self, loc1: tuple, loc2: tuple) -> float:
        """Calculate distance between two locations in km"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth's radius in km
        
        lat1, lon1 = loc1
        lat2, lon2 = loc2
        
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return R * c
    
    def _distance_to_segment(
        self,
        point: tuple,
        seg_start: tuple,
        seg_end: tuple
    ) -> float:
        """Calculate distance from point to line segment"""
        # Implementation of point-to-segment distance
        lat1, lon1 = point
        lat2, lon2 = seg_start
        lat3, lon3 = seg_end
        
        # Simple approximation using Euclidean distance
        A = lat3 - lat2
        B = lon3 - lon2
        C = lat1 - lat2
        D = lon1 - lon2
        
        dot = A * C + B * D
        len_sq = A * A + B * B
        
        if len_sq == 0:
            return self._distance(point, seg_start) * 111  # Convert degrees to km
        
        param = max(0, min(1, dot / len_sq))
        
        closest_lat = lat2 + param * A
        closest_lon = lon2 + param * B
        
        return self._distance(point, (closest_lat, closest_lon)) * 1000  # Convert to meters
    
    def _calculate_severity(self, current: float, limit: float) -> str:
        """Calculate severity based on limit"""
        excess = current - limit
        excess_percent = (excess / limit) * 100
        
        if excess_percent > 50:
            return "high"
        elif excess_percent > 25:
            return "medium"
        else:
            return "low"
    
    def _get_severity_level(self, current: float, threshold: float) -> str:
        """Get severity level"""
        if current > threshold:
            return "high"
        elif current > threshold * 0.5:
            return "medium"
        else:
            return "low"
    
    async def _get_driver_flags(self, driver_id: str) -> Dict[str, Any]:
        """Get driver behavior flags"""
        # In production, query from database
        return {
            "harassment_complaints": 0,
            "cancellation_rate": 0.1,
            "safety_incidents": 0
        }
    
    async def _get_user_flags(self, user_id: str) -> Dict[str, Any]:
        """Get user behavior flags"""
        # In production, query from database
        return {
            "fraud_attempts": 0,
            "complaint_count": 0,
            "cancellation_rate": 0.05
        }
    
    def _get_recommended_action(self, threats: List[Dict[str, Any]]) -> Optional[str]:
        """Get recommended action for detected threats"""
        if not threats:
            return None
        
        high_severity_threats = [t for t in threats if t['severity'] == 'high']
        
        if high_severity_threats:
            threat_type = high_severity_threats[0]['type']
            if threat_type == 'SUSPICIOUS_DRIVER' or threat_type == 'SUSPICIOUS_USER':
                return "BLOCK_TRIP"
            elif threat_type == 'SPEEDING':
                return "ALERT_DRIVER"
            elif threat_type == 'DISTANCE_ANOMALY':
                return "CONTACT_DRIVER"
        
        return "MONITOR"
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process threat detection request"""
        return await self.detect_threat(*args, **kwargs)
