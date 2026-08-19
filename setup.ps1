# DalaSmart Development Environment Setup Script
# This script automates the initial setup of the DalaSmart platform

param(
    [switch]$DownloadOSM = $false,
    [switch]$SkipOSRM = $false,
    [switch]$Quick = $false
)

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "DalaSmart Development Environment Setup" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$startLocation = Get-Location

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 20) {
        Write-Host "  ✗ Node.js version 20 or higher required (found $nodeVersion)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "  ✓ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version
    Write-Host "  ✓ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker Compose not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ All prerequisites met`n" -ForegroundColor Green

# Install npm dependencies
if (-not $Quick) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ npm dependencies installed`n" -ForegroundColor Green

    # Build shared types
    Write-Host "Building shared types..." -ForegroundColor Yellow
    npm run build --workspace=packages/shared-types
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Shared types built`n" -ForegroundColor Green
}

# Setup OSRM
if (-not $SkipOSRM) {
    Set-Location infrastructure
    
    if (-not (Test-Path "osrm-data")) {
        Write-Host "Creating OSRM data directory..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path "osrm-data" | Out-Null
        Write-Host "  ✓ OSRM data directory created`n" -ForegroundColor Green
    }

    $osmFile = "osrm-data/tanzania-latest.osm.pbf"
    $osrmFile = "osrm-data/tanzania-latest.osrm"

    if (-not (Test-Path $osmFile)) {
        if ($DownloadOSM) {
            Write-Host "Downloading Tanzania OSM extract (~120 MB)..." -ForegroundColor Yellow
            Write-Host "  This may take a few minutes depending on your connection...`n" -ForegroundColor Gray
            
            try {
                Invoke-WebRequest -Uri "https://download.geofabrik.de/africa/tanzania-latest.osm.pbf" -OutFile $osmFile
                Write-Host "  ✓ OSM data downloaded`n" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Download failed: $_" -ForegroundColor Red
                Write-Host "  You can manually download from: https://download.geofabrik.de/africa/tanzania.html" -ForegroundColor Yellow
                Set-Location $startLocation
                exit 1
            }
        } else {
            Write-Host "OSM data not found. Download manually or run with -DownloadOSM flag" -ForegroundColor Yellow
            Write-Host "  Download from: https://download.geofabrik.de/africa/tanzania.html" -ForegroundColor Gray
            Write-Host "  Place file in: infrastructure/osrm-data/tanzania-latest.osm.pbf`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✓ OSM data found`n" -ForegroundColor Green
    }

    if ((Test-Path $osmFile) -and -not (Test-Path $osrmFile)) {
        Write-Host "Preprocessing OSRM data (this takes 5-10 minutes)..." -ForegroundColor Yellow
        Write-Host "  This is a one-time operation`n" -ForegroundColor Gray

        # Extract
        Write-Host "  1/3 Extracting..." -ForegroundColor Cyan
        $extractCmd = "docker run -t -v `"${PWD}/osrm-data:/data`" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/tanzania-latest.osm.pbf"
        Invoke-Expression $extractCmd
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ OSRM extract failed" -ForegroundColor Red
            Set-Location $startLocation
            exit 1
        }

        # Partition
        Write-Host "  2/3 Partitioning..." -ForegroundColor Cyan
        $partitionCmd = "docker run -t -v `"${PWD}/osrm-data:/data`" osrm/osrm-backend osrm-partition /data/tanzania-latest.osrm"
        Invoke-Expression $partitionCmd
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ OSRM partition failed" -ForegroundColor Red
            Set-Location $startLocation
            exit 1
        }

        # Customize
        Write-Host "  3/3 Customizing..." -ForegroundColor Cyan
        $customizeCmd = "docker run -t -v `"${PWD}/osrm-data:/data`" osrm/osrm-backend osrm-customize /data/tanzania-latest.osrm"
        Invoke-Expression $customizeCmd
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ✗ OSRM customize failed" -ForegroundColor Red
            Set-Location $startLocation
            exit 1
        }

        Write-Host "  ✓ OSRM data preprocessed`n" -ForegroundColor Green
    }

    Set-Location $startLocation
}

# Start infrastructure
Write-Host "Starting infrastructure services..." -ForegroundColor Yellow
Set-Location infrastructure
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to start Docker services" -ForegroundColor Red
    Set-Location $startLocation
    exit 1
}

Write-Host "`nWaiting for services to become healthy (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Set-Location $startLocation
Write-Host "  ✓ Infrastructure services started`n" -ForegroundColor Green

# Verify services
Write-Host "Verifying services..." -ForegroundColor Yellow

# Check PostgreSQL
try {
    $pgResult = docker exec dalasmart-postgres psql -U dalasmart -d dalasmart -c "SELECT COUNT(*) FROM fare_configs;" 2>&1
    if ($pgResult -match '\d+') {
        Write-Host "  ✓ PostgreSQL: Connected" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ PostgreSQL: Not ready yet (may need more time)" -ForegroundColor Yellow
}

# Check Redis
try {
    $redisResult = docker exec dalasmart-redis redis-cli ping
    if ($redisResult -eq "PONG") {
        Write-Host "  ✓ Redis: Connected" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Redis: Not ready yet" -ForegroundColor Yellow
}

# Check OSRM
if (-not $SkipOSRM) {
    try {
        $osrmResult = Invoke-RestMethod -Uri "http://localhost:5000/route/v1/driving/39.2731,-6.8206;39.2117,-6.7311?overview=false" -TimeoutSec 5
        if ($osrmResult.routes) {
            $distance = [math]::Round($osrmResult.routes[0].distance / 1000, 1)
            Write-Host "  ✓ OSRM: Responding ($distance km test route)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠ OSRM: Not ready yet" -ForegroundColor Yellow
    }
}

# Check Elasticsearch
try {
    $esResult = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -TimeoutSec 5
    if ($esResult.status -in @("green", "yellow")) {
        Write-Host "  ✓ Elasticsearch: Connected" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Elasticsearch: Not ready yet" -ForegroundColor Yellow
}

# Check MinIO
try {
    $minioResult = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -TimeoutSec 5 -UseBasicParsing
    if ($minioResult.StatusCode -eq 200) {
        Write-Host "  ✓ MinIO: Connected" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ MinIO: Not ready yet" -ForegroundColor Yellow
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Infrastructure URLs:" -ForegroundColor Yellow
Write-Host "  PostgreSQL:     localhost:5432 (user: dalasmart, db: dalasmart)"
Write-Host "  Redis:          localhost:6379"
Write-Host "  Elasticsearch:  http://localhost:9200"
Write-Host "  Kibana:         http://localhost:5601"
Write-Host "  MinIO Console:  http://localhost:9001 (user: minioadmin)"
if (-not $SkipOSRM) {
    Write-Host "  OSRM API:       http://localhost:5000"
}

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Review tasks in .kiro/specs/dalasmart-ai-platform/tasks.md"
Write-Host "  2. Start implementing services (see README.md)"
Write-Host "  3. Test with GPS simulator: cd scripts && npm run simulate"

Write-Host "`nUseful Commands:" -ForegroundColor Yellow
Write-Host "  Stop services:    docker compose -f infrastructure/docker-compose.yml down"
Write-Host "  View logs:        docker compose -f infrastructure/docker-compose.yml logs -f"
Write-Host "  Run tests:        npm test"
Write-Host "  Type check:       npm run typecheck`n"
