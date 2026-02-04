#!/bin/bash

# Script to export Docker images for deployment
# Usage: ./export-images.sh [output-directory]

set -e

OUTPUT_DIR=${1:-./docker-images}
mkdir -p "$OUTPUT_DIR"

echo "Building Docker images..."
docker-compose build

echo "Exporting images to $OUTPUT_DIR..."

# Export backend image
echo "Exporting backend image..."
docker save real_estate_estimator-backend:latest -o "$OUTPUT_DIR/backend-image.tar"

# Export frontend image
echo "Exporting frontend image..."
docker save real_estate_estimator-frontend:latest -o "$OUTPUT_DIR/frontend-image.tar"

# Export postgres image (if not already present)
echo "Exporting postgres image..."
docker save postgres:15-alpine -o "$OUTPUT_DIR/postgres-image.tar"

echo "✅ All images exported to $OUTPUT_DIR/"
echo ""
echo "📦 Files to transfer to target system:"
echo "  1. Docker images: $OUTPUT_DIR/*.tar"
echo "  2. docker-compose.deploy.yml (deployment version)"
echo "  3. .env.example (as template)"
echo "  ⚠️  DO NOT transfer .env file (contains secrets!)"
echo "  ⚠️  DO NOT transfer source code (backend/, frontend/ folders)"
echo ""
echo "🚀 On target system:"
echo "  1. Load images:"
echo "     docker load -i $OUTPUT_DIR/backend-image.tar"
echo "     docker load -i $OUTPUT_DIR/frontend-image.tar"
echo "     docker load -i $OUTPUT_DIR/postgres-image.tar"
echo ""
echo "  2. Create .env file:"
echo "     cp .env.example .env"
echo "     nano .env  # Edit with production values"
echo ""
echo "  3. Start services (use deploy compose file):"
echo "     docker-compose -f docker-compose.deploy.yml up -d"

