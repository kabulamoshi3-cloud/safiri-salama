# DalaSmart - Start All Services
# Opens 4 terminals with all required services

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DalaSmart - Starting All Services           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Redis is running
Write-Host "`n[1/5] Checking Redis..." -ForegroundColor Yellow
try {
    $redisTest = Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet -ErrorAction SilentlyContinue
    if ($redisTest) {
        Write-Host "  ✓ Redis is running" -ForegroundColor Green
    } else {
        throw "Redis not running"
    }
} catch {
    Write-Host "  ✗ Redis is NOT running!" -ForegroundColor Red
    Write-Host "`n  Please start Redis first:" -ForegroundColor Yellow
    Write-Host "    Option 1: redis-server" -ForegroundColor Gray
    Write-Host "    Option 2: docker run --name dalasmart-redis -p 6379:6379 -d redis:7" -ForegroundColor Gray
    Write-Host "`n  Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if tracking service .env exists
Write-Host "`n[2/5] Checking configuration..." -ForegroundColor Yellow
$envPath = Join-Path $scriptPath "services\tracking-service\.env"
if (!(Test-Path $envPath)) {
    Write-Host "  ⚠ Warning: tracking-service/.env not found" -ForegroundColor Yellow
    Write-Host "  Creating from template..." -ForegroundColor Gray
    Copy-Item "$envPath.example" $envPath
    Write-Host "  ✓ Created .env file" -ForegroundColor Green
    Write-Host "`n  ⚠ IMPORTANT: Add your Google Maps API key to:" -ForegroundColor Yellow
    Write-Host "     $envPath" -ForegroundColor Gray
    Write-Host "`n  Press any key to continue..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "  ✓ Configuration files found" -ForegroundColor Green
}

Write-Host "`n[3/5] Starting Tracking Service (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\services\tracking-service'; Write-Host '═══════════════════════════════════════' -ForegroundColor Cyan; Write-Host '   TRACKING SERVICE (Port 3001)' -ForegroundColor Cyan; Write-Host '═══════════════════════════════════════' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 2
Write-Host "  ✓ Terminal 1 opened" -ForegroundColor Green

Write-Host "`n[4/5] Starting API Gateway (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\services\api-gateway'; Write-Host '═══════════════════════════════════════' -ForegroundColor Green; Write-Host '   API GATEWAY (Port 3000)' -ForegroundColor Green; Write-Host '═══════════════════════════════════════' -ForegroundColor Green; npm run dev"
Start-Sleep -Seconds 2
Write-Host "  ✓ Terminal 2 opened" -ForegroundColor Green

Write-Host "`n[5/5] Starting Web Platform (Port 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\apps\web-platform'; Write-Host '═══════════════════════════════════════' -ForegroundColor Blue; Write-Host '   WEB PLATFORM (Port 5174)' -ForegroundColor Blue; Write-Host '═══════════════════════════════════════' -ForegroundColor Blue; npm run dev"
Start-Sleep -Seconds 2
Write-Host "  ✓ Terminal 3 opened" -ForegroundColor Green

# Optional: Start Driver Dashboard
Write-Host "`n[OPTIONAL] Start Driver Dashboard? (y/n): " -ForegroundColor Yellow -NoNewline
$response = Read-Host
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Starting Driver Dashboard (Port 5173)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\apps\driver-dashboard'; Write-Host '═══════════════════════════════════════' -ForegroundColor Magenta; Write-Host '   DRIVER DASHBOARD (Port 5173)' -ForegroundColor Magenta; Write-Host '═══════════════════════════════════════' -ForegroundColor Magenta; npm run dev"
    Write-Host "  ✓ Terminal 4 opened" -ForegroundColor Green
}

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   All Services Starting...                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n📝 Services:" -ForegroundColor White
Write-Host "   • Tracking Service:  http://localhost:3001" -ForegroundColor Gray
Write-Host "   • API Gateway:       http://localhost:3000" -ForegroundColor Gray
Write-Host "   • Web Platform:      http://localhost:5174" -ForegroundColor Gray
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "   • Driver Dashboard:  http://localhost:5173" -ForegroundColor Gray
}

Write-Host "`n⏱️  Wait 10-15 seconds for all services to start..." -ForegroundColor Yellow

Write-Host "`n🧪 Test URLs:" -ForegroundColor White
Write-Host "   • Health Check:  http://localhost:3001/health" -ForegroundColor Gray
Write-Host "   • Web App:       http://localhost:5174" -ForegroundColor Gray

Write-Host "`n📖 Documentation:" -ForegroundColor White
Write-Host "   • TESTING_GUIDE.md - Step-by-step testing" -ForegroundColor Gray
Write-Host "   • FEATURE_COMPLETION_REPORT.md - What's implemented" -ForegroundColor Gray

Write-Host "`n✅ All services are starting in separate windows!" -ForegroundColor Green
Write-Host "   Check each terminal for startup messages." -ForegroundColor Gray
Write-Host ""
