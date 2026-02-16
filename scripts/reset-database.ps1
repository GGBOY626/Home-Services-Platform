# Reset home_services database: drop and recreate for fresh schema
# Run from project root. Ensure MySQL container is running (docker-compose up -d).

$ErrorActionPreference = "Stop"

Write-Host "Resetting database home_services..." -ForegroundColor Cyan
docker exec home-services-mysql mysql -uroot -pYoobee@2025! -e "DROP DATABASE IF EXISTS home_services; CREATE DATABASE home_services CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed. Is MySQL container running? Try: docker-compose up -d" -ForegroundColor Red
    exit 1
}

Write-Host "Database reset complete. Restart the backend to apply migrations." -ForegroundColor Green
