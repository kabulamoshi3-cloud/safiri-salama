"""
Base AI Service Class

All AI services inherit from this base class
"""

from abc import ABC, abstractmethod
from datetime import datetime
import logging
from typing import Any, Dict, Optional
import redis
from ..config import settings

logger = logging.getLogger(__name__)

class AIService(ABC):
    """Base class for all AI services"""
    
    def __init__(self, service_name: str):
        """
        Initialize AI service
        
        Args:
            service_name: Name of the service
        """
        self.service_name = service_name
        self.model = None
        self.scaler = None
        self.redis_client = self._init_redis()
        self.logger = logging.getLogger(f"dalasmart.{service_name}")
    
    def _init_redis(self):
        """Initialize Redis connection for caching"""
        try:
            return redis.from_url(settings.REDIS_URL)
        except Exception as e:
            self.logger.warning(f"Failed to connect to Redis: {str(e)}")
            return None
    
    @abstractmethod
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process request - must be implemented by subclass"""
        pass
    
    def cache_result(self, key: str, value: Any, ttl: int = 3600):
        """
        Cache result in Redis
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
        """
        if not self.redis_client:
            return
        
        try:
            self.redis_client.setex(key, ttl, str(value))
        except Exception as e:
            self.logger.warning(f"Failed to cache result: {str(e)}")
    
    def get_cached_result(self, key: str) -> Optional[Any]:
        """
        Get cached result from Redis
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None
        """
        if not self.redis_client:
            return None
        
        try:
            return self.redis_client.get(key)
        except Exception as e:
            self.logger.warning(f"Failed to get cached result: {str(e)}")
            return None
    
    def log_metrics(self, metrics: Dict[str, float]):
        """Log service metrics"""
        for metric_name, value in metrics.items():
            self.logger.info(f"{self.service_name}: {metric_name}={value}")
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get status of AI model"""
        return {
            "service": self.service_name,
            "status": "ready" if self.model else "not_loaded",
            "last_updated": datetime.now().isoformat(),
            "model_type": self.model.__class__.__name__ if self.model else None
        }
    
    def validate_input(self, data: Dict[str, Any], required_fields: list) -> bool:
        """
        Validate input data
        
        Args:
            data: Input dictionary
            required_fields: List of required field names
        
        Returns:
            True if valid, raises ValueError otherwise
        """
        missing_fields = [f for f in required_fields if f not in data or data[f] is None]
        if missing_fields:
            raise ValueError(f"Missing required fields: {missing_fields}")
        return True
