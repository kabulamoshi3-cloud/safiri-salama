"""
DalaSmart AI Engine Configuration

Handles environment variables, API keys, model paths, etc.
"""

from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # API Configuration
    APP_NAME: str = "DalaSmart AI Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:5173",
        "https://app.dalasmart.com",
        "https://admin.dalasmart.com"
    ]
    
    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/dalasmart"
    )
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Google Cloud Configuration
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "dalasmart-ai")
    GOOGLE_CLOUD_CREDENTIALS: str = os.getenv("GOOGLE_CLOUD_CREDENTIALS", "")
    
    # AWS Configuration
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    # Model Paths
    MODELS_DIR: str = os.getenv("MODELS_DIR", "./models")
    FRAUD_MODEL_PATH: str = os.path.join(MODELS_DIR, "fraud_detector.pkl")
    DEMAND_FORECAST_MODEL_PATH: str = os.path.join(MODELS_DIR, "demand_forecast.pkl")
    PRICING_MODEL_PATH: str = os.path.join(MODELS_DIR, "pricing_model.pkl")
    ROUTING_MODEL_PATH: str = os.path.join(MODELS_DIR, "routing_model.pkl")
    
    # ML Configuration
    MODEL_CONFIDENCE_THRESHOLD: float = 0.95
    FRAUD_THRESHOLD: float = 0.7
    
    # API Keys
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    
    # Feature Flags
    ENABLE_IDENTITY_VERIFICATION: bool = True
    ENABLE_FRAUD_DETECTION: bool = True
    ENABLE_CHATBOT: bool = True
    ENABLE_PERSONALIZATION: bool = True
    ENABLE_DYNAMIC_PRICING: bool = True
    ENABLE_ROUTE_OPTIMIZATION: bool = True
    ENABLE_DEMAND_FORECASTING: bool = True
    ENABLE_THREAT_DETECTION: bool = True
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()
