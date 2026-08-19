"""
AI Chatbot Service

Handles natural language understanding and customer support
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
import logging
from .base import AIService
from ..config import settings

logger = logging.getLogger(__name__)

class ChatbotService(AIService):
    """AI service for customer support chatbot"""
    
    def __init__(self):
        super().__init__("chatbot")
        self.nlp_model = self._init_nlp_model()
        self.intents = self._setup_intents()
    
    def _init_nlp_model(self):
        """Initialize NLP model"""
        try:
            from transformers import pipeline
            return pipeline("zero-shot-classification")
        except Exception as e:
            self.logger.warning(f"Failed to initialize NLP model: {str(e)}")
            return None
    
    def _setup_intents(self) -> Dict[str, Dict[str, Any]]:
        """Setup conversation intents"""
        return {
            "where_is_driver": {
                "keywords": ["where", "driver", "location", "eta", "when"],
                "action": "GET_DRIVER_LOCATION"
            },
            "refund_request": {
                "keywords": ["refund", "money back", "compensation", "charge"],
                "action": "PROCESS_REFUND"
            },
            "price_question": {
                "keywords": ["price", "charge", "why", "expensive", "cost"],
                "action": "EXPLAIN_PRICING"
            },
            "complaint": {
                "keywords": ["bad", "rude", "dirty", "wrong", "issue"],
                "action": "FILE_COMPLAINT"
            },
            "payment_issue": {
                "keywords": ["payment", "card", "wallet", "balance", "credit"],
                "action": "HANDLE_PAYMENT"
            },
            "booking_help": {
                "keywords": ["book", "ride", "cannot", "problem", "help"],
                "action": "BOOKING_ASSISTANCE"
            }
        }
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        trip_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate response
        
        Args:
            user_id: User ID
            message: User message
            trip_id: Current trip ID (optional)
            context: Additional context (optional)
        
        Returns:
            Chatbot response
        """
        try:
            # Detect intent
            intent_result = await self.detect_intent(message)
            intent = intent_result['intent']
            
            # Generate response
            response = await self._generate_response(
                user_id, message, intent, trip_id, context
            )
            
            # Determine sentiment
            sentiment = self._analyze_sentiment(message)
            
            # Cache conversation
            cache_key = f"chat:{user_id}:{datetime.now().timestamp()}"
            self.cache_result(cache_key, {
                "message": message,
                "intent": intent,
                "response": response,
                "sentiment": sentiment
            })
            
            return {
                "user_id": user_id,
                "response": response,
                "intent": intent,
                "action": self.intents.get(intent, {}).get("action"),
                "user_satisfaction": sentiment,
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Message processing failed: {str(e)}")
            raise
    
    async def detect_intent(self, message: str) -> Dict[str, Any]:
        """
        Detect user intent from message
        
        Args:
            message: User message
        
        Returns:
            Detected intent with confidence
        """
        try:
            message_lower = message.lower()
            
            # Check keywords
            best_match = None
            best_score = 0
            
            for intent_name, intent_config in self.intents.items():
                keywords = intent_config['keywords']
                matches = sum(1 for kw in keywords if kw in message_lower)
                score = matches / len(keywords) if keywords else 0
                
                if score > best_score:
                    best_score = score
                    best_match = intent_name
            
            # Use NLP if available and confidence is low
            if not best_match or best_score < 0.3:
                if self.nlp_model:
                    candidate_labels = list(self.intents.keys())
                    result = self.nlp_model(message, candidate_labels)
                    best_match = result['labels'][0]
                    best_score = result['scores'][0]
                else:
                    best_match = "general_query"
                    best_score = 0.5
            
            return {
                "intent": best_match,
                "confidence": float(best_score),
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Intent detection failed: {str(e)}")
            return {"intent": "general_query", "confidence": 0.0}
    
    async def _generate_response(
        self,
        user_id: str,
        message: str,
        intent: str,
        trip_id: Optional[str],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Generate response based on intent"""
        
        if intent == "where_is_driver":
            if trip_id and context:
                driver_info = context.get("driver_info", {})
                return (
                    f"Your driver {driver_info.get('name', 'Driver')} is "
                    f"{driver_info.get('eta', 5)} minutes away. "
                    f"You can track their location in real-time."
                )
            return "To track your driver, please ensure you have an active trip."
        
        elif intent == "refund_request":
            if trip_id:
                return (
                    "I understand. Let me check your trip details. "
                    "To process your refund, could you tell me what went wrong?"
                )
            return "I'd be happy to help with a refund. Which trip would you like assistance with?"
        
        elif intent == "price_question":
            if context and context.get('trip_cost'):
                return (
                    f"Your trip cost Sh{context['trip_cost']}. "
                    f"This includes base fare + distance + time + current demand. "
                    f"Here's the breakdown: {context.get('breakdown', 'N/A')}"
                )
            return "Pricing is based on distance, time, and current demand. What trip are you asking about?"
        
        elif intent == "complaint":
            return (
                "I'm sorry to hear that. Your feedback helps us improve. "
                "I've noted your complaint and will escalate it to our support team."
            )
        
        elif intent == "payment_issue":
            return (
                "Let's resolve your payment issue. "
                "Is this about adding a payment method, insufficient balance, or a failed transaction?"
            )
        
        elif intent == "booking_help":
            return (
                "I'm here to help! To book a ride, enter your pickup and destination. "
                "If you're having technical issues, could you describe the problem?"
            )
        
        else:
            return (
                "I'm here to help! You can ask me about your trips, pricing, payment, "
                "complaints, or booking issues. How can I assist?"
            )
    
    def _analyze_sentiment(self, message: str) -> float:
        """Analyze sentiment of message (0-1, where 1 is most positive)"""
        try:
            from transformers import pipeline
            sentiment_pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
            result = sentiment_pipeline(message[:512])  # Limit to 512 chars
            
            score = result[0]['score']
            if result[0]['label'] == 'NEGATIVE':
                score = 1 - score
            
            return float(score)
        
        except Exception as e:
            self.logger.warning(f"Sentiment analysis failed: {str(e)}")
            # Simple fallback
            negative_words = ['bad', 'awful', 'terrible', 'hate', 'angry', 'frustrated']
            positive_words = ['good', 'great', 'thanks', 'happy', 'satisfied']
            
            message_lower = message.lower()
            neg_count = sum(1 for w in negative_words if w in message_lower)
            pos_count = sum(1 for w in positive_words if w in message_lower)
            
            if pos_count + neg_count == 0:
                return 0.5
            return pos_count / (pos_count + neg_count)
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process chatbot request"""
        return await self.process_message(*args, **kwargs)
