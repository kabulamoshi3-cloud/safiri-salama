# DalaSmart Health Check
# Verifies all services are running correctly

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DalaSmart System Health Check               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

$allHealthy = $true

# Check Redis
Write-Host "`n[1/5] Checking Redis (Port 6379)..." -ForegroundColor Yellow
try {
    $redisTest = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($redisTest) {
        Write-Host "  ✓ Redis is running" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Redis is NOT running" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "  ✗ Redis check failed" -ForegroundColor Red
    $allHealthy = $false
}

# Check Tracking Service
Write-Host "`n[2/5] Checking Tracking Service (Port 3001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Host "  ✓ Tracking Service is healthy" -ForegroundColor Green
    Write-Host "    Active drivers: $($data.activeDrivers)" -ForegroundColor Gray
    Write-Host "    Active passengers: $($data.activePassengers)" -ForegroundColor Gray
    Write-Host "    Active trips: $($data.activeTrips)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Tracking Service is NOT running" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

# Check API Gateway
Write-Host "`n[3/5] Checking API Gateway (Port 3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ API Gateway is healthy" -ForegroundColor Green
} catch {
    Write-Host "  ✗ API Gateway is NOT running" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

# Check Web Platform
Write-Host "`n[4/5] Checking Web Platform (Port 5174)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ Web Platform is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Web Platform is NOT running" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

# Check Database
Write-Host "`n[5/5] Checking Database..." -ForegroundColor Yellow
try {
    $dbCheck = psql -U postgres -d dalasmart -c "SELECT COUNT(*) FROM trips;" -t 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database check failed" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "  ⚠ Could not check database (psql not in PATH)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
if ($allHealthy) {
    Write-Host "║   ✅ ALL SYSTEMS HEALTHY                       ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    Write-Host "`n🚀 System is ready for testing!" -ForegroundColor Green
    Write-Host "`n📝 Quick Links:" -ForegroundColor White
    Write-Host "   • Web App:        http://localhost:5174" -ForegroundColor Gray
    Write-Host "   • API Gateway:    http://localhost:3000" -ForegroundColor Gray
    Write-Host "   • Tracking API:   http://localhost:3001" -ForegroundColor Gray
    
    Write-Host "`n🧪 Test Commands:" -ForegroundColor White
    Write-Host "   # Test route calculation" -ForegroundColor Gray
    Write-Host '   Invoke-WebRequest -Method POST -Uri "http://localhost:3001/api/routes/calculate" -ContentType "application/json" -Body ''{"origin":{"latitude":-6.7924,"longitude":39.2083},"destination":{"latitude":-6.8235,"longitude":39.2693},"vehicleType":"car"}'' | Select-Object -Expand Content | ConvertFrom-Json' -ForegroundColor DarkGray
} else {
    Write-Host "║   ⚠️  SOME SERVICES NOT RUNNING                ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Start missing services with: .\start-all-services.ps1" -ForegroundColor Gray
    Write-Host "   2. Check TESTING_GUIDE.md for detailed instructions" -ForegroundColor Gray
    Write-Host "   3. Verify .env files are configured correctly" -ForegroundColor Gray
}

Write-Host ""
