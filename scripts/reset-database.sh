#!/bin/bash
# Reset home_services database: drop and recreate for full reset
# Run from project root. Ensure MySQL container is running (docker-compose up -d).

set -e

echo "Resetting database home_services..."
docker exec -i home-services-mysql mysql -uroot -pYoobee@2025! -e "
DROP DATABASE IF EXISTS home_services;
CREATE DATABASE home_services CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

echo "Database reset complete. Restart the backend to apply migrations."
