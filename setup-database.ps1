# DalaSmart Database Setup Script
# Run this after PostgreSQL is properly installed and running

Write-Host ""
Write-Host "Database Setup for DalaSmart" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create database
Write-Host "Step 1: Creating database 'dalasmart'..." -ForegroundColor Yellow
Write-Host "Please run this SQL command in your PostgreSQL client:" -ForegroundColor White
Write-Host ""
Write-Host "  CREATE DATABASE dalasmart;" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter when done..." -ForegroundColor Gray
Read-Host

# Step 2: Create .env file
Write-Host ""
Write-Host "Step 2: Creating .env file..." -ForegroundColor Yellow
$envPath = ".\services\api-gateway\.env"

if (Test-Path $envPath) {
    Write-Host "  .env file already exists" -ForegroundColor Green
} else {
    $envContent = @"
# Database Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dalasmart

# JWT Secret (change in production!)
JWT_SECRET=dalasmart-jwt-secret-change-in-production-$(Get-Random)

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Origins (frontend URLs)
CORS_ORIGIN=http://localhost:5173;http://localhost:5174

# WhatsApp Integration (optional - add your Twilio credentials)
# TWILIO_ACCOUNT_SID=your_account_sid
# TWILIO_AUTH_TOKEN=your_auth_token  
# TWILIO_WHATSAPP_NUMBER=+1234567890
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "  Created .env file successfully" -ForegroundColor Green
}

# Step 3: Run migrations
Write-Host ""
Write-Host "Step 3: Running database migrations..." -ForegroundColor Yellow
cd ".\services\api-gateway"

if (Test-Path "node_modules") {
    Write-Host "  Running migrations..." -ForegroundColor Cyan
    npm run migrate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Migrations completed successfully" -ForegroundColor Green
        
        # Step 4: Seed data
        Write-Host ""
        Write-Host "Step 4: Seeding initial data..." -ForegroundColor Yellow
        npm run seed
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Database seeded successfully" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  Installing dependencies first..." -ForegroundColor Cyan
    npm install
    Write-Host ""
    Write-Host "  Now run: npm run db:setup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start backend:     cd services\api-gateway && npm run dev" -ForegroundColor White
Write-Host "  2. Start driver dash: cd apps\driver-dashboard && npm run dev" -ForegroundColor White
Write-Host "  3. Start web platform: cd apps\web-platform && npm run dev" -ForegroundColor White
Write-Host ""
