"""
Route Optimization Service

A* algorithm for optimal routing
"""

from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
import logging
import heapq
from .base import AIService

logger = logging.getLogger(__name__)

class RouteOptimizationService(AIService):
    """AI service for route optimization"""
    
    def __init__(self):
        super().__init__("route_optimization")
    
    async def optimize_route(
        self,
        origin: tuple,
        destination: tuple,
        current_time: datetime,
        vehicle_type: str = "sedan",
        avoid_toll: bool = False
    ) -> Dict[str, Any]:
        """
        Optimize route from origin to destination
        
        Args:
            origin: Origin coordinates (lat, lon)
            destination: Destination coordinates (lat, lon)
            current_time: Current time
            vehicle_type: Type of vehicle
            avoid_toll: Whether to avoid toll roads
        
        Returns:
            Optimized route
        """
        try:
            # Use A* algorithm to find optimal route
            optimal_route = await self._astar_route(
                origin, destination, avoid_toll
            )
            
            # Calculate metrics
            distance = self._calculate_total_distance(optimal_route)
            estimated_time = self._estimate_time(distance, current_time)
            cost_estimate = int(distance * 100 + estimated_time * 10)  # Sh
            
            # Get traffic info
            traffic_info = await self._get_traffic_info(optimal_route, current_time)
            
            return {
                "optimal_route": optimal_route,
                "estimated_time": estimated_time,
                "estimated_distance": distance,
                "cost_estimate": cost_estimate,
                "traffic_info": traffic_info,
                "vehicle_type": vehicle_type,
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Route optimization failed: {str(e)}")
            # Return direct route as fallback
            return {
                "optimal_route": [origin, destination],
                "estimated_time": 30,
                "estimated_distance": 10.0,
                "cost_estimate": 1500,
                "traffic_info": {},
                "timestamp": datetime.now()
            }
    
    async def _astar_route(
        self,
        origin: tuple,
        destination: tuple,
        avoid_toll: bool = False
    ) -> List[tuple]:
        """
        A* algorithm for route finding
        
        Args:
            origin: Start coordinates
            destination: End coordinates
            avoid_toll: Whether to avoid tolls
        
        Returns:
            List of waypoints
        """
        try:
            # Generate waypoints grid (simplified)
            # In production, use actual road network
            
            open_set = []
            heapq.heappush(open_set, (0, origin))
            
            came_from = {}
            g_score = {origin: 0}
            f_score = {origin: self._heuristic(origin, destination)}
            
            while open_set:
                current = heapq.heappop(open_set)[1]
                
                if self._is_close(current, destination):
                    # Reconstruct path
                    path = [destination]
                    while current in came_from:
                        current = came_from[current]
                        path.append(current)
                    path.reverse()
                    return path
                
                # Generate neighbors
                neighbors = self._get_neighbors(current)
                
                for neighbor in neighbors:
                    if avoid_toll and self._is_toll_road(current, neighbor):
                        continue
                    
                    tentative_g_score = g_score[current] + self._distance(current, neighbor)
                    
                    if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g_score
                        f_score[neighbor] = tentative_g_score + self._heuristic(neighbor, destination)
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
            
            # No path found, return direct
            return [origin, destination]
        
        except Exception as e:
            self.logger.warning(f"A* route finding failed: {str(e)}")
            return [origin, destination]
    
    def _heuristic(self, pos: tuple, goal: tuple) -> float:
        """Heuristic function (straight-line distance)"""
        return self._distance(pos, goal)
    
    def _distance(self, pos1: tuple, pos2: tuple) -> float:
        """Calculate distance between two positions"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth's radius in km
        
        lat1, lon1 = pos1
        lat2, lon2 = pos2
        
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return R * c
    
    def _is_close(self, pos: tuple, goal: tuple, threshold: float = 0.1) -> bool:
        """Check if position is close to goal"""
        return self._distance(pos, goal) < threshold
    
    def _get_neighbors(self, pos: tuple, step: float = 0.01) -> List[tuple]:
        """Get neighboring waypoints"""
        lat, lon = pos
        return [
            (lat + step, lon),
            (lat - step, lon),
            (lat, lon + step),
            (lat, lon - step),
            (lat + step, lon + step),
            (lat - step, lon - step),
            (lat + step, lon - step),
            (lat - step, lon + step),
        ]
    
    def _is_toll_road(self, pos1: tuple, pos2: tuple) -> bool:
        """Check if route segment is a toll road"""
        # Placeholder - in production, query toll road database
        return False
    
    def _calculate_total_distance(self, route: List[tuple]) -> float:
        """Calculate total distance of route"""
        total = 0
        for i in range(len(route) - 1):
            total += self._distance(route[i], route[i + 1])
        return total
    
    def _estimate_time(self, distance: float, trip_time: datetime) -> int:
        """Estimate trip time in minutes"""
        # Average speed based on time of day
        hour = trip_time.hour
        
        if 7 <= hour < 9 or 16 <= hour < 19:  # Rush hour
            speed = 20  # km/h
        elif 22 <= hour or hour < 5:  # Night
            speed = 60  # km/h
        else:  # Normal
            speed = 40  # km/h
        
        return int((distance / speed) * 60)  # Convert to minutes
    
    async def _get_traffic_info(self, route: List[tuple], trip_time: datetime) -> Dict[str, Any]:
        """Get traffic information for route"""
        # Placeholder - in production, query traffic API
        return {
            "average_speed": 40,
            "congestion_level": "moderate",
            "incidents": []
        }
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process route optimization request"""
        return await self.optimize_route(*args, **kwargs)
