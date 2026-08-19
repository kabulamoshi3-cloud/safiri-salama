"""
Identity Verification Service

Handles liveness detection and face matching using Google Cloud Vision API
"""

from datetime import datetime
from typing import Dict, Any, Tuple, Optional
import logging
from fastapi import UploadFile
import httpx
from .base import AIService
from ..config import settings

logger = logging.getLogger(__name__)

class IdentityVerificationService(AIService):
    """AI service for identity verification"""
    
    def __init__(self):
        super().__init__("identity_verification")
        self.liveness_threshold = 0.95
        self.face_match_threshold = 0.95
        self.gcloud_client = self._init_gcloud_client()
    
    def _init_gcloud_client(self):
        """Initialize Google Cloud Vision client"""
        try:
            from google.cloud import vision
            return vision.ImageAnnotatorClient()
        except Exception as e:
            self.logger.warning(f"Failed to initialize Google Cloud Vision: {str(e)}")
            return None
    
    async def verify_driver_identity(
        self,
        driver_id: str,
        selfie_path: str,
        id_path: str
    ) -> Dict[str, Any]:
        """
        Complete identity verification process
        
        Args:
            driver_id: Unique driver ID
            selfie_path: Path to selfie image
            id_path: Path to ID document image
        
        Returns:
            Verification result
        """
        try:
            # Check liveness
            is_alive, liveness_score = await self.check_liveness_from_path(selfie_path)
            
            if not is_alive or liveness_score < self.liveness_threshold:
                return {
                    "status": "REJECTED",
                    "driver_id": driver_id,
                    "reason": "Liveness check failed or not a real person",
                    "liveness_score": liveness_score,
                    "match_score": None,
                    "timestamp": datetime.now()
                }
            
            # Extract ID information
            id_info = await self.extract_id_info(id_path)
            
            # Match faces
            match_score = await self.match_faces(selfie_path, id_path)
            
            if match_score < self.face_match_threshold:
                return {
                    "status": "REJECTED",
                    "driver_id": driver_id,
                    "reason": "Face mismatch between selfie and ID document",
                    "liveness_score": liveness_score,
                    "match_score": match_score,
                    "timestamp": datetime.now()
                }
            
            # All checks passed
            return {
                "status": "VERIFIED",
                "driver_id": driver_id,
                "id_info": id_info,
                "match_score": match_score,
                "liveness_score": liveness_score,
                "verification_timestamp": datetime.now(),
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Identity verification failed: {str(e)}")
            raise
    
    async def check_liveness(self, image: UploadFile) -> Dict[str, Any]:
        """
        Check if image shows a live person
        
        Args:
            image: UploadFile image
        
        Returns:
            Liveness check result
        """
        try:
            # Save temp file
            contents = await image.read()
            temp_path = f"/tmp/{image.filename}"
            with open(temp_path, "wb") as f:
                f.write(contents)
            
            is_alive, confidence = await self.check_liveness_from_path(temp_path)
            
            return {
                "is_live": is_alive,
                "confidence": confidence,
                "timestamp": datetime.now()
            }
        
        except Exception as e:
            self.logger.error(f"Liveness check failed: {str(e)}")
            raise
    
    async def check_liveness_from_path(self, image_path: str) -> Tuple[bool, float]:
        """
        Check liveness from image file path
        
        Args:
            image_path: Path to image file
        
        Returns:
            (is_alive: bool, confidence: float)
        """
        try:
            # Read image
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Use Google Cloud Vision API if available
            if self.gcloud_client:
                return await self._gcloud_liveness_check(image_data)
            
            # Fallback to local analysis
            return await self._local_liveness_check(image_path)
        
        except Exception as e:
            self.logger.error(f"Liveness check failed: {str(e)}")
            raise
    
    async def _gcloud_liveness_check(self, image_data: bytes) -> Tuple[bool, float]:
        """Check liveness using Google Cloud Vision"""
        try:
            from google.cloud import vision
            
            image = vision.Image(content=image_data)
            response = self.gcloud_client.face_detection(image=image)
            faces = response.face_annotations
            
            if not faces:
                return False, 0.0
            
            face = faces[0]
            
            # Analyze face attributes
            checks = {
                "has_eyes": len(face.landmarks) >= 2,
                "has_mouth": any(lm.type_ == 10 for lm in face.landmarks),  # Mouth landmarks
                "no_extreme_blur": face.detection_confidence > 0.8,
                "natural_lighting": face.blurred_likelihood <= 2,
                "head_pose_natural": abs(face.roll_angle) < 30
            }
            
            # Calculate liveness score
            passed = sum(1 for v in checks.values() if v)
            score = passed / len(checks)
            
            return score > 0.6, score
        
        except Exception as e:
            self.logger.error(f"Google Cloud liveness check failed: {str(e)}")
            return False, 0.0
    
    async def _local_liveness_check(self, image_path: str) -> Tuple[bool, float]:
        """Fallback local liveness check"""
        try:
            import cv2
            import numpy as np
            
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                return False, 0.0
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            if len(faces) == 0:
                return False, 0.0
            
            # Simple liveness check based on face properties
            # In production, use more sophisticated methods
            confidence = min(0.9, len(faces) * 0.3 + 0.6)
            
            return confidence > 0.5, confidence
        
        except Exception as e:
            self.logger.error(f"Local liveness check failed: {str(e)}")
            return False, 0.0
    
    async def extract_id_info(self, id_path: str) -> Dict[str, Any]:
        """
        Extract information from ID document using OCR
        
        Args:
            id_path: Path to ID document image
        
        Returns:
            Extracted ID information
        """
        try:
            if not self.gcloud_client:
                return {"error": "Vision API not available"}
            
            # Read image
            with open(id_path, "rb") as f:
                image_data = f.read()
            
            from google.cloud import vision
            image = vision.Image(content=image_data)
            
            # Perform OCR
            response = self.gcloud_client.document_text_detection(image=image)
            text = response.full_text_annotation.text
            
            # Parse extracted text (simplified)
            id_info = self._parse_id_text(text)
            
            return id_info
        
        except Exception as e:
            self.logger.error(f"ID extraction failed: {str(e)}")
            return {}
    
    async def match_faces(self, selfie_path: str, id_path: str) -> float:
        """
        Compare selfie to ID face using face recognition
        
        Args:
            selfie_path: Path to selfie
            id_path: Path to ID document
        
        Returns:
            Match score (0-1)
        """
        try:
            import face_recognition
            
            # Load images
            selfie_image = face_recognition.load_image_file(selfie_path)
            id_image = face_recognition.load_image_file(id_path)
            
            # Get face encodings
            selfie_encodings = face_recognition.face_encodings(selfie_image)
            id_encodings = face_recognition.face_encodings(id_image)
            
            if not selfie_encodings or not id_encodings:
                return 0.0
            
            # Compare faces
            face_distances = face_recognition.face_distance(
                [id_encodings[0]],
                selfie_encodings[0]
            )
            
            # Convert distance to similarity score
            match_score = 1 - min(face_distances[0], 1.0)
            
            return match_score
        
        except ImportError:
            # Fallback if face_recognition not installed
            return 0.85
        except Exception as e:
            self.logger.error(f"Face matching failed: {str(e)}")
            return 0.0
    
    def _parse_id_text(self, text: str) -> Dict[str, Any]:
        """Parse OCR text from ID document"""
        # Simplified parsing - in production, use more robust parsing
        lines = text.split('\n')
        
        return {
            "raw_text": text,
            "lines": [l.strip() for l in lines if l.strip()],
            "extracted_at": datetime.now().isoformat()
        }
    
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Process identity verification request"""
        return await self.verify_driver_identity(*args, **kwargs)
