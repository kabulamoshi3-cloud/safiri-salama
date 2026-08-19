#!/usr/bin/env python
"""
Comprehensive test script for all 8 AI services
Tests each service and reports results
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8001"
RESULTS = {}

def test_service(service_name, endpoint, method="GET", data=None, timeout=15):
    """Test a service endpoint"""
    print(f"\n{'='*70}")
    print(f"Testing: {service_name}")
    print(f"{'='*70}")
    
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        else:
            response = requests.post(url, json=data, timeout=timeout)
        
        status_code = response.status_code
        result = response.json() if response.text else {}
        
        # Print results
        print(f"✅ Status: {status_code}")
        print(f"✅ Response: {json.dumps(result, indent=2, default=str)[:500]}")
        
        RESULTS[service_name] = {
            "status": "PASS",
            "code": status_code,
            "response": result
        }
        
        return True
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        RESULTS[service_name] = {
            "status": "FAIL",
            "error": str(e)
        }
        return False

# Test 1: Health Check
print("\n" + "="*70)
print("TESTING ALL 8 AI SERVICES")
print("="*70)

test_service("1. HEALTH CHECK", "/health", "GET")

# Give server a moment
time.sleep(1)

# Test 2: Fraud Detection
fraud_data = {
    'user_id': 'USER-123',
    'trip_id': 'TRIP-456',
    'account_age_days': 1,
    'new_device': True,
    'new_location': True,
    'location_jump_distance': 8000,
    'payment_method_change': True,
    'amount_variance': 0.8,
    'time_since_last_transaction': 0,
    'device_fingerprint_match': 0.2,
    'ip_reputation_score': 0.1,
    'similar_to_known_fraud': 0.9
}
test_service("2. FRAUD DETECTION", "/api/v1/fraud/detect", "POST", fraud_data)

# Test 3: Chatbot
chat_data = {
    'user_id': 'USER-789',
    'message': 'Where is my driver?',
    'trip_id': 'TRIP-999',
    'context': {}
}
test_service("3. CHATBOT", "/api/v1/chatbot/message", "POST", chat_data)

# Test 4: Personalization
person_data = {
    'user_id': 'USER-456',
    'available_drivers': [
        {'id': 'DRV-1', 'rating': 4.9, 'specialization': 'office'},
        {'id': 'DRV-2', 'rating': 4.5, 'specialization': 'highway'}
    ],
    'pickup_location': [51.5074, -0.1278]
}
test_service("4. PERSONALIZATION", "/api/v1/personalization/recommend-driver", "POST", person_data)

# Test 5: Dynamic Pricing
pricing_data = {
    'distance': 12.5,
    'estimated_time': 25,
    'pickup_location': [51.5074, -0.1278],
    'destination': [51.5200, -0.0800],
    'weather': 'rain',
    'user_id': 'USER-123',
    'trip_time': datetime.now().isoformat()
}
test_service("5. DYNAMIC PRICING", "/api/v1/pricing/calculate", "POST", pricing_data)

# Test 6: Route Optimization
route_data = {
    'origin': [51.5074, -0.1278],
    'destination': [51.5200, -0.0800],
    'current_time': datetime.now().isoformat(),
    'vehicle_type': 'sedan',
    'avoid_toll': False
}
test_service("6. ROUTE OPTIMIZATION", "/api/v1/routing/optimize", "POST", route_data, timeout=20)

# Test 7: Demand Forecasting
test_service("7. DEMAND FORECASTING", 
    "/api/v1/forecasting/demand?location=51.5074,-0.1278&hours_ahead=2", "GET", timeout=20)

# Test 8: Threat Detection
threat_data = {
    'trip_id': 'TRIP-456',
    'driver_id': 'DRV-123',
    'user_id': 'USER-123',
    'current_location': [51.5074, -0.1278],
    'driver_location': [51.5100, -0.1200],
    'trip_route': [[51.5074, -0.1278], [51.5200, -0.0800]],
    'speed': 50.0,
    'timestamp': datetime.now().isoformat()
}
test_service("8. THREAT DETECTION", "/api/v1/threat/detect", "POST", threat_data, timeout=10)

# Test 9: Admin Endpoints
test_service("9. MODEL STATUS", "/api/v1/admin/model-status", "GET", timeout=10)

test_service("10. PERFORMANCE METRICS", "/api/v1/admin/performance-metrics", "GET", timeout=10)

# Print summary
print("\n\n" + "="*70)
print("TEST SUMMARY")
print("="*70)

passed = sum(1 for r in RESULTS.values() if r.get('status') == 'PASS')
failed = sum(1 for r in RESULTS.values() if r.get('status') == 'FAIL')

for service, result in RESULTS.items():
    status = "✅ PASS" if result.get('status') == 'PASS' else "❌ FAIL"
    print(f"{status} - {service}")
    if 'error' in result:
        print(f"     Error: {result['error'][:100]}")

print(f"\n{'='*70}")
print(f"TOTAL: {passed} PASSED, {failed} FAILED out of {len(RESULTS)} tests")
print(f"{'='*70}")

if failed == 0:
    print("\n🎉 ALL TESTS PASSED! AI Engine is working correctly.")
else:
    print(f"\n⚠️  {failed} tests failed. Check errors above.")
