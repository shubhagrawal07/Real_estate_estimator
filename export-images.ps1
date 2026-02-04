# PowerShell script to export Docker images for deployment
# Usage: .\export-images.ps1 [output-directory]

param(
    [string]$OutputDir = ".\docker-images"
)

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "Building Docker images..." -ForegroundColor Cyan
docker-compose build

Write-Host "Exporting images to $OutputDir..." -ForegroundColor Cyan

# Export backend image
Write-Host "Exporting backend image..." -ForegroundColor Yellow
docker save real_estate_estimator-backend:latest -o "$OutputDir\backend-image.tar"

# Export frontend image
Write-Host "Exporting frontend image..." -ForegroundColor Yellow
docker save real_estate_estimator-frontend:latest -o "$OutputDir\frontend-image.tar"

# Export postgres image
Write-Host "Exporting postgres image..." -ForegroundColor Yellow
docker save postgres:15-alpine -o "$OutputDir\postgres-image.tar"

Write-Host "`n✅ All images exported to $OutputDir\" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Files to transfer to target system:" -ForegroundColor Cyan
Write-Host "  1. Docker images: $OutputDir\*.tar"
Write-Host "  2. docker-compose.deploy.yml (deployment version)"
Write-Host "  3. .env.example (as template)"
Write-Host "  ⚠️  DO NOT transfer .env file (contains secrets!)" -ForegroundColor Yellow
Write-Host "  ⚠️  DO NOT transfer source code (backend/, frontend/ folders)" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 On target system:" -ForegroundColor Cyan
Write-Host "  1. Load images:"
Write-Host "     docker load -i $OutputDir\backend-image.tar"
Write-Host "     docker load -i $OutputDir\frontend-image.tar"
Write-Host "     docker load -i $OutputDir\postgres-image.tar"
Write-Host ""
Write-Host "  2. Create .env file:"
Write-Host "     Copy-Item .env.example .env"
Write-Host "     notepad .env  # Edit with production values"
Write-Host ""
Write-Host "  3. Start services (use deploy compose file):"
Write-Host "     docker-compose -f docker-compose.deploy.yml up -d"

