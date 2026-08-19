# DalaSmart Tracking Setup Script
# Installs dependencies for tracking service and web platform

Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host "   DalaSmart Real-Time Tracking Setup" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

# Step 1: Install tracking service dependencies
Write-Host "`n[1/4] Installing Tracking Service dependencies..." -ForegroundColor Yellow
Set-Location "services\tracking-service"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install tracking service dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Tracking service dependencies installed" -ForegroundColor Green
Set-Location "..\..\"

# Step 2: Install web platform socket.io client
Write-Host "`n[2/4] Installing Web Platform socket dependencies..." -ForegroundColor Yellow
Set-Location "apps\web-platform"
npm install socket.io-client
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install socket.io-client" -ForegroundColor Red
    Set-Location "..\..\"
    exit 1
}
Write-Host "  ✓ Web platform socket dependencies installed" -ForegroundColor Green
Set-Location "..\..\"

# Step 3: Create .env file if not exists
Write-Host "`n[3/4] Configuring environment..." -ForegroundColor Yellow
$envPath = "services\tracking-service\.env"
if (!(Test-Path $envPath)) {
    Copy-Item "services\tracking-service\.env.example" $envPath
    Write-Host "  ✓ Created .env file from template" -ForegroundColor Green
    Write-Host "`n  ⚠ IMPORTANT: Edit $envPath and add your Google Maps API key!" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ .env file already exists" -ForegroundColor Green
}

# Step 4: Check Redis
Write-Host "`n[4/4] Checking Redis..." -ForegroundColor Yellow
try {
    $redisCheck = Test-Connection -ComputerName localhost -Port 6379 -Count 1 -ErrorAction SilentlyContinue
    if ($redisCheck) {
        Write-Host "  ✓ Redis is running on port 6379" -ForegroundColor Green
    } else {
        throw "Redis not running"
    }
} catch {
    Write-Host "  ✗ Redis is not running" -ForegroundColor Red
    Write-Host "`n  To install Redis:" -ForegroundColor Yellow
    Write-Host "    Option 1 (Chocolatey): choco install redis-64 && redis-server" -ForegroundColor Gray
    Write-Host "    Option 2 (Docker):     docker run --name dalasmart-redis -p 6379:6379 -d redis:7" -ForegroundColor Gray
}

# Summary
Write-Host "`n==============================================================" -ForegroundColor Cyan
Write-Host "   Setup Complete!" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Add your Google Maps API key to services\tracking-service\.env" -ForegroundColor White
Write-Host "  2. Run database migration: cd services\api-gateway && npm run migrate" -ForegroundColor White
Write-Host "  3. Start services in separate terminals:" -ForegroundColor White
Write-Host "     Terminal 1: cd services\tracking-service && npm run dev" -ForegroundColor Gray
Write-Host "     Terminal 2: cd services\api-gateway && npm run dev" -ForegroundColor Gray
Write-Host "     Terminal 3: cd apps\web-platform && npm run dev" -ForegroundColor Gray
Write-Host "     Terminal 4: cd apps\driver-dashboard && npm run dev" -ForegroundColor Gray

Write-Host "`n🚀 Features Implemented:" -ForegroundColor Green
Write-Host "  ✓ Real-time GPS tracking with WebSocket" -ForegroundColor White
Write-Host "  ✓ Route intelligence (fastest, shortest, cheapest)" -ForegroundColor White
Write-Host "  ✓ Traffic monitoring and dynamic rerouting" -ForegroundColor White
Write-Host "  ✓ Vehicle types: car, bajaji, boda-boda" -ForegroundColor White
Write-Host "  ✓ SOS emergency alerts" -ForegroundColor White
Write-Host "  ✓ Trip sharing for safety" -ForegroundColor White

Write-Host "`n📖 Documentation: TRACKING_IMPLEMENTATION.md" -ForegroundColor Cyan
Write-Host ""
