# 🧪 SkyRex Testing Guide

## Automated unit tests

From the repository root, run:

```sh
npm test
```

This runs the socket-free API gateway validation tests, all web platform Vitest
tests, and the ML traffic predictor tests with Python's standard `unittest`
runner. No database, Redis server, external API, or trained model is needed.

You can also run each suite directly:

```sh
cd services/api-gateway && npx jest --runInBand --runTestsByPath src/__tests__/middleware/validation.unit.test.ts
cd apps/web-platform && npm test -- --run
cd ../.. && python3 -m unittest discover -s services/ml-service/tests -v
```

The API route suites under `services/api-gateway/src/__tests__/routes` use
Supertest and bind a local HTTP socket. They are separate from the socket-free
unit suite and may require an environment that permits local socket binding.
The project also contains services and apps with no unit suites yet; the root
command currently runs the suites listed above.

## Step-by-Step Testing Instructions

---

## 📋 Pre-Testing Checklist

### 1. **Check Prerequisites**

```powershell
# Check Node.js
node --version
# Should show: v26.5.0 or similar

# Check npm
npm --version

# Check if PostgreSQL is accessible
psql --version
# Should show: PostgreSQL 15+ 

# Check Redis (if installed)
redis-cli ping
# Should return: PONG
# If not, use Docker: docker run --name skyrex-redis -p 6379:6379 -d redis:7
```

---

## 🚀 Step 1: Install Dependencies

### Option A: Using Setup Script (Recommended)
```powershell
cd "c:\project\INF 319\skyrex"
.\setup-tracking.ps1
```

### Option B: Manual Installation
```powershell
# Install tracking service dependencies
cd "c:\project\INF 319\skyrex\services\tracking-service"
npm install

# Install web platform socket dependencies
cd "c:\project\INF 319\skyrex\apps\web-platform"
npm install socket.io-client

cd "c:\project\INF 319\skyrex"
```

---

## 🔑 Step 2: Configure Environment

### **Get Google Maps API Key** (Critical!)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable these APIs:
   - **Directions API**
   - **Geocoding API**
   - **Maps JavaScript API**
4. Create API Key
5. Copy the key

### **Configure Tracking Service**

Edit `services/tracking-service/.env`:
```env
# Server
TRACKING_PORT=3001
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:3000

# JWT (use same as api-gateway)
JWT_SECRET=your_jwt_secret_key_here

# Google Maps API Key (REQUIRED!)
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skyrex

# Web App URL
WEB_APP_URL=http://localhost:5174
```

### **Configure Web Platform**

Edit `apps/web-platform/.env` (create if doesn't exist):
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_TRACKING_URL=http://localhost:3001
```

---

## 🗄️ Step 3: Setup Database

### **Option A: If Database Already Setup**
```powershell
cd services\api-gateway
npm run migrate
# This runs the new migration 009_add_tracking_features.sql
```

### **Option B: Fresh Database Setup**
```powershell
# Create database (if not exists)
createdb skyrex
# Or: psql -U postgres -c "CREATE DATABASE skyrex;"

# Run all migrations
cd services\api-gateway
npm run db:setup
```

### **Verify Database**
```powershell
psql -U postgres -d skyrex -c "\dt"
# Should show 25+ tables including:
# - trip_routes
# - location_history
# - emergency_contacts
# - sos_alerts
# - trip_shares
# - pricing_rates
```

---

## 🚀 Step 4: Start All Services

### **Terminal 1: Start Redis (if not running)**
```powershell
# If using installed Redis:
redis-server

# OR using Docker:
docker run --name skyrex-redis -p 6379:6379 -d redis:7
```

### **Terminal 2: Start Tracking Service**
```powershell
cd "c:\project\INF 319\skyrex\services\tracking-service"
npm run dev
```

**Expected Output:**
```
✓ Tracking Service running on port 3001
✓ WebSocket ready for real-time tracking
```

### **Terminal 3: Start API Gateway**
```powershell
cd "c:\project\INF 319\skyrex\services\api-gateway"
npm run dev
```

**Expected Output:**
```
✓ Server running on port 3000
✓ Database connected
```

### **Terminal 4: Start Web Platform**
```powershell
cd "c:\project\INF 319\skyrex\apps\web-platform"
npm run dev
```

**Expected Output:**
```
✓ Local: http://localhost:5174
```

### **Optional Terminal 5: Start Driver Dashboard**
```powershell
cd "c:\project\INF 319\skyrex\apps\driver-dashboard"
npm run dev
```

**Expected Output:**
```
✓ Local: http://localhost:5173
```

---

## 🧪 Step 5: Test Each Feature

### **Test 1: Health Check** ✅

```powershell
# Test API Gateway
curl http://localhost:3000/health

# Test Tracking Service
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "activeDrivers": 0,
  "activePassengers": 0,
  "activeTrips": 0
}
```

---

### **Test 2: Route Intelligence** 🗺️

Open browser console (F12) and run:

```javascript
// Test route calculation
fetch('http://localhost:3001/api/routes/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: { latitude: -6.7924, longitude: 39.2083 },
    destination: { latitude: -6.8235, longitude: 39.2693 },
    vehicleType: 'car',
    alternatives: true
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Route calculation works!');
  console.log('Routes found:', data.routes.length);
  console.log('Fastest route:', data.routes[0]);
})
.catch(err => console.error('❌ Route calculation failed:', err));
```

**Expected Output:**
```
✅ Route calculation works!
Routes found: 3
Fastest route: {
  type: "fastest",
  distance: 12500,
  duration: 1200,
  cost: 18750,
  trafficCondition: "moderate"
}
```

---

### **Test 3: Vehicle Comparison** 🚗🛺🏍️

```javascript
fetch('http://localhost:3001/api/routes/compare-vehicles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: { latitude: -6.7924, longitude: 39.2083 },
    destination: { latitude: -6.8235, longitude: 39.2693 }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Vehicle comparison works!');
  console.log('Car:', data.comparison[0].estimatedCost, 'TZS');
  console.log('Bajaji:', data.comparison[1].estimatedCost, 'TZS');
  console.log('Boda-boda:', data.comparison[2].estimatedCost, 'TZS');
})
.catch(err => console.error('❌ Vehicle comparison failed:', err));
```

**Expected Output:**
```
✅ Vehicle comparison works!
Car: 18750 TZS
Bajaji: 12500 TZS
Boda-boda: 10000 TZS
```

---

### **Test 4: Traffic Monitoring** 🚦

```javascript
fetch('http://localhost:3001/api/routes/traffic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: { latitude: -6.7924, longitude: 39.2083 },
    destination: { latitude: -6.8235, longitude: 39.2693 }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Traffic monitoring works!');
  console.log('Traffic condition:', data.trafficCondition);
  console.log('Normal duration:', data.normalDuration, 'seconds');
  console.log('Current duration:', data.currentDuration, 'seconds');
  console.log('Delay:', data.delay, 'seconds');
})
.catch(err => console.error('❌ Traffic monitoring failed:', err));
```

---

### **Test 5: SOS Emergency** 🚨

```javascript
fetch('http://localhost:3001/api/safety/sos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tripId: 1,
    userId: 1,
    userType: 'passenger',
    location: { latitude: -6.8050, longitude: 39.2400 }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ SOS alert works!');
  console.log('Alert ID:', data.alertId);
  console.log('Status:', data.status);
})
.catch(err => console.error('❌ SOS failed:', err));
```

---

### **Test 6: Full User Journey** 🎯 (Manual)

#### **6.1 Open Web Platform**
1. Go to http://localhost:5174
2. Should see home page

#### **6.2 Register/Login**
1. Click "Sign Up" or "Login"
2. Create account or login with existing credentials

#### **6.3 Create Booking**
1. Click "Book a Ride"
2. Enter pickup: "Kariakoo Market, Dar es Salaam"
3. Enter destination: "Julius Nyerere Airport"
4. **Expected**: Should proceed to Step 2

#### **6.4 Select Vehicle**
1. Should see 3 vehicle options:
   - 🚗 Car (most expensive)
   - 🛺 Bajaji (medium price) 
   - 🏍️ Boda-Boda (cheapest)
2. Compare prices
3. Select any vehicle
4. **Expected**: Should show loading then route options

#### **6.5 Select Route** ⭐ NEW FEATURE
1. Should see multiple routes:
   - ⚡ Fastest route
   - 📏 Shortest route
   - 💰 Cheapest route
2. Each shows:
   - Distance (km)
   - Duration (minutes)
   - Cost (TZS)
   - Traffic condition badge
3. Select a route
4. **Expected**: Route selected, continue button active

#### **6.6 Confirm Booking**
1. Review trip summary
2. Select payment method
3. Click "Confirm Booking"
4. **Expected**: Booking created, redirected to trip page

#### **6.7 Live Tracking** ⭐ NEW FEATURES

**What You Should See:**
- ✅ Map with markers (pickup, destination, driver)
- ✅ **Blue/green route line drawn on map** 🆕
- ✅ Driver info card
- ✅ Live ETA and distance
- ✅ **Traffic condition badge** 🆕
- ✅ **Journey progress bar (during trip)** 🆕
- ✅ SOS button
- ✅ Trip sharing option

**Monitor Console (F12):**
```
✓ Connected to tracking service
📊 Started traffic monitoring for trip 123
```

**Wait 2-3 minutes:**
- Should see traffic check in server console
- If traffic changes significantly, should see:
  - ⚠️ **ETA change notification** 🆕
  - 🚦 **Faster route suggestion** 🆕

---

## 🐛 Troubleshooting

### **Problem: "Google Maps API key not configured"**

**Solution:**
```powershell
# Edit services/tracking-service/.env
# Add: GOOGLE_MAPS_API_KEY=your_actual_key
# Restart tracking service
```

### **Problem: "Redis connection refused"**

**Solution:**
```powershell
# Check if Redis is running
redis-cli ping

# If not running, start it:
redis-server
# OR
docker run --name skyrex-redis -p 6379:6379 -d redis:7
```

### **Problem: "Database connection failed"**

**Solution:**
```powershell
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check database exists
psql -U postgres -c "\l" | findstr skyrex

# Create if not exists
createdb skyrex
```

### **Problem: "Route not showing on map"**

**Possible Causes:**
1. Google Maps API key not added
2. Directions API not enabled in Google Cloud
3. Console errors (check F12)

**Solution:**
1. Verify API key in `.env`
2. Enable Directions API in Google Cloud Console
3. Check browser console for errors

### **Problem: "ETA notifications not appearing"**

**Expected Behavior:**
- Notifications only show if ETA changes by 5+ minutes
- Traffic monitoring runs every 2 minutes
- May take 2-4 minutes to see first check

**To Test Immediately:**
```javascript
// Manually trigger ETA change (in browser console)
// This simulates what the backend does
socket.emit('eta:changed', {
  previousETA: 20,
  newETA: 27,
  reason: 'Heavy traffic detected',
  delayMinutes: 7
});
```

### **Problem: Port Already in Use**

```powershell
# Find process using port (e.g., 3001)
netstat -ano | findstr :3001

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F
```

---

## ✅ Success Criteria

### **All Features Working When:**

✅ **Backend:**
- [ ] All 4 services start without errors
- [ ] Health endpoints return "healthy"
- [ ] Redis connected (PONG response)
- [ ] Database connected (migrations complete)

✅ **Route Intelligence:**
- [ ] Multiple routes calculated
- [ ] Traffic conditions displayed
- [ ] Cost comparison works
- [ ] Vehicle comparison works

✅ **Real-Time Tracking:**
- [ ] Map loads with markers
- [ ] **Route polyline drawn** 🆕
- [ ] Driver location updates
- [ ] Distance/ETA updates
- [ ] **Traffic badge shows** 🆕

✅ **Continuous Monitoring:**
- [ ] Traffic checked every 2 minutes (console logs)
- [ ] **ETA notifications appear on changes** 🆕
- [ ] **Faster route suggestions work** 🆕
- [ ] **Progress bar updates** 🆕

✅ **Safety Features:**
- [ ] SOS button works
- [ ] Trip sharing generates links
- [ ] Emergency contacts saved

---

## 📊 Performance Benchmarks

### **Expected Response Times:**

| Endpoint | Expected Time |
|----------|--------------|
| Route calculation | < 2 seconds |
| Vehicle comparison | < 1 second |
| Traffic check | < 2 seconds |
| GPS location update | < 100ms |
| WebSocket message | < 50ms |

### **Expected Behavior:**

| Feature | Update Frequency |
|---------|-----------------|
| GPS location | Every 5 seconds |
| Traffic monitoring | Every 2 minutes |
| Route optimization | Every 2 minutes |
| Map refresh | Real-time |
| ETA calculation | Every location update |

---

## 🎯 Testing Scenarios

### **Scenario 1: Short Trip (Kariakoo → CBD)**
```
Distance: ~5 km
Expected duration: 10-15 minutes
Expected cost (car): ~7,500 TZS
Traffic: Usually moderate
```

### **Scenario 2: Medium Trip (Kariakoo → Airport)**
```
Distance: ~12 km
Expected duration: 20-30 minutes
Expected cost (car): ~18,000 TZS
Traffic: Variable (can test route optimization)
```

### **Scenario 3: Long Trip (City → Bagamoyo)**
```
Distance: ~75 km
Expected duration: 90-120 minutes
Expected cost (car): ~112,500 TZS
Traffic: Light outside city
```

---

## 🔍 Debug Mode

### **Enable Detailed Logging:**

**Tracking Service:**
```javascript
// Add to services/tracking-service/src/index.ts (top of file)
const DEBUG = true;

if (DEBUG) {
  console.log('🔍 Debug mode enabled');
}
```

**Frontend:**
```javascript
// Add to LiveTracking.tsx
useEffect(() => {
  console.log('🔍 Trip Status:', tripStatus);
  console.log('🔍 Driver Location:', driverLocation);
  console.log('🔍 Current Route:', currentRoute);
}, [tripStatus, driverLocation, currentRoute]);
```

---

## 📝 Test Results Template

```
Date: _______________
Tester: _______________

✅ Services Started
   [ ] Redis running
   [ ] Tracking service (3001)
   [ ] API Gateway (3000)
   [ ] Web Platform (5174)

✅ Route Intelligence
   [ ] Route calculation works
   [ ] Multiple routes shown
   [ ] Traffic data accurate
   [ ] Vehicle comparison works

✅ Real-Time Tracking
   [ ] Map loads correctly
   [ ] Route polyline visible
   [ ] Driver marker moves
   [ ] ETA updates
   [ ] Progress bar works

✅ Traffic Monitoring
   [ ] Checks every 2 minutes
   [ ] ETA notifications appear
   [ ] Route suggestions work
   [ ] Traffic badge updates

✅ Safety Features
   [ ] SOS alert works
   [ ] Trip sharing works
   [ ] Emergency contacts save

Issues Found:
_________________________________
_________________________________
_________________________________

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Next Steps After Testing

1. **If All Tests Pass:**
   - System is ready for user testing
   - Can proceed to deployment preparation
   - Start collecting user feedback

2. **If Issues Found:**
   - Document specific errors
   - Check relevant documentation
   - Contact support/review code

3. **Production Readiness:**
   - Load testing (1000+ concurrent users)
   - Security audit
   - Performance optimization
   - Monitoring setup

---

## 📞 Support

**Common Issues:** See Troubleshooting section above

**Documentation:**
- `TRACKING_IMPLEMENTATION.md` - Technical details
- `FEATURE_COMPLETION_REPORT.md` - What was implemented
- `IMPLEMENTATION_COMPLETE.md` - Overall summary

**Quick Reference:**
- Tracking Service: http://localhost:3001
- API Gateway: http://localhost:3000
- Web Platform: http://localhost:5174
- Driver Dashboard: http://localhost:5173

---

**Ready to start testing!** 🧪🚀

Follow the steps above and check off each item as you go.
