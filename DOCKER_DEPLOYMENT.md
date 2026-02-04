# Docker Deployment Guide

This guide explains how to deploy the Real Estate Estimator application using Docker without sharing source code.

## Quick Reference: Transferring Images with `.env`

**When exporting Docker images as `.tar` files:**

✅ **DO transfer:**
- Docker image `.tar` files (backend-image.tar, frontend-image.tar, postgres-image.tar)
- `docker-compose.deploy.yml` (deployment version - uses pre-built images)
- `.env.example` (as a template)

❌ **DO NOT transfer:**
- Your `.env` file (contains secrets - create it fresh on target system)
- Source code directories (`backend/`, `frontend/`) - not needed!

**On target system:**
1. Load Docker images: `docker load -i <image>.tar`
2. Create `.env` file: `cp .env.example .env` then edit with production values
3. Start services: `docker-compose -f docker-compose.deploy.yml up -d`

**Why?** 
- Docker images don't include environment variables. The `.env` file is read by Docker Compose at runtime to inject configuration into containers.
- The `docker-compose.deploy.yml` file uses `image:` instead of `build:`, so it doesn't need source code directories.

## Overview

The application uses multi-stage Docker builds to:
- Compile TypeScript/Next.js code during build
- Only include compiled artifacts in production images
- Keep source code out of production containers

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Access to the target deployment system

## Quick Start

### 1. Build Docker Images

```bash
# Build all services
docker-compose build

# Or build individually
docker-compose build backend
docker-compose build frontend
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with your production values. You can use the example below as a template.

**Windows PowerShell:**
```powershell
# Create .env file from template
Copy-Item .env.example .env

# Or create it manually
New-Item -Path .env -ItemType File

# Then edit it with your preferred editor (Notepad, VS Code, etc.)
notepad .env
# or
code .env
```

**Linux/Mac:**
```bash
cp .env.example .env
# Edit .env with your production settings
nano .env  # or use your preferred editor
```

**Example `.env` file content:**
```env
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=real_estate_db

# Server Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
NODE_ENV=production

# Frontend URL for CORS (update with your production domain)
FRONTEND_URL=http://localhost:3000

# Next.js Public API URL (update with your production backend URL)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT Secret (generate a strong random string)
# Windows PowerShell: [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
# Linux/Mac: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_key_here_change_in_production

# NextAuth Secret (required for Next.js authentication in production)
# Generate the same way as JWT_SECRET - can use the same value or generate a separate one
# Windows PowerShell: [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
# Linux/Mac: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here_change_in_production

# DVF Open Data API (optional)
DVF_API_BASE_URL=https://apidf-preprod.cerema.fr/dvf_opendata/mutations/
DVF_API_TIMEOUT_MS=90000
```

**Important:** 
- Never commit `.env` files with real credentials!
- Generate a strong `JWT_SECRET` for production (see commands above)
- Update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` with your production domain URLs

### 3. Run Locally (Testing)

```bash
# Start all services
docker-compose up

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Deployment Options

### Option A: Export Docker Images (Recommended for Air-Gapped Systems)

1. **Build images:**
   ```bash
   docker-compose build
   ```

2. **Save images to files:**
   ```bash
   docker save real_estate_estimator-backend:latest -o backend-image.tar
   docker save real_estate_estimator-frontend:latest -o frontend-image.tar
   docker save postgres:15-alpine -o postgres-image.tar
   ```

   Or save all at once:
   ```bash
   docker save $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(real_estate|postgres)") -o app-images.tar
   ```

3. **Transfer files to target system** (via USB, network share, etc.)
   
   **Important:** You need to transfer these files:
   - Docker image `.tar` files (backend-image.tar, frontend-image.tar, postgres-image.tar)
   - `docker-compose.deploy.yml` file (use this instead of docker-compose.yml - it uses pre-built images)
   - `.env.example` file (as a template)
   - **DO NOT transfer your `.env` file** (it contains secrets - create it fresh on target system)
   - **DO NOT transfer source code** (backend/, frontend/ directories) - not needed!

4. **On target system, load images:**
   ```bash
   docker load -i backend-image.tar
   docker load -i frontend-image.tar
   docker load -i postgres-image.tar
   ```
   
   **Verify images are loaded:**
   ```bash
   docker images | grep real_estate
   ```
   
   You should see:
   - `real_estate_estimator-backend:latest`
   - `real_estate_estimator-frontend:latest`

5. **Create `.env` file on target system:**
   
   **Windows PowerShell:**
   ```powershell
   # Copy the example file
   Copy-Item .env.example .env
   
   # Edit with your production values
   notepad .env
   ```
   
   **Linux/Mac:**
   ```bash
   cp .env.example .env
   nano .env  # or your preferred editor
   ```
   
   **Fill in your production values:**
   - Database credentials
   - Google OAuth credentials
   - Generate new secrets (JWT_SECRET, NEXTAUTH_SECRET)
   - Update URLs for production domain

6. **Start services using the deployment compose file:**
   ```bash
   docker-compose -f docker-compose.deploy.yml up -d
   ```
   
   **Note:** 
   - Use `docker-compose.deploy.yml` (not `docker-compose.yml`) - it uses pre-built images instead of building from source
   - Docker Compose automatically reads the `.env` file from the same directory
   - The environment variables in `docker-compose.deploy.yml` (like `${DB_USERNAME}`) will be replaced with values from your `.env` file

### Option B: Private Container Registry

1. **Tag images:**
   ```bash
   docker tag real_estate_estimator-backend:latest your-registry/backend:v1.0.0
   docker tag real_estate_estimator-frontend:latest your-registry/frontend:v1.0.0
   ```

2. **Push to registry:**
   ```bash
   docker push your-registry/backend:v1.0.0
   docker push your-registry/frontend:v1.0.0
   ```

3. **On target system, update docker-compose.yml** to use registry images:
   ```yaml
   backend:
     image: your-registry/backend:v1.0.0
     # ... rest of config
   ```

4. **Pull and run:**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

### Important: About `.env` Files and Docker Images

**⚠️ Critical:** Docker images (`.tar` files) do NOT include your `.env` file or any environment variables. Here's why and how to handle it:

**Why `.env` is not in images:**
- Docker images only contain the application code and dependencies
- Environment variables are injected at runtime by Docker Compose
- Including secrets in images would be a security risk

**What to do:**
1. **On source system:** Keep your `.env` file secure and do NOT transfer it
2. **On target system:** Create a NEW `.env` file with production values
3. **Use `.env.example`** as a template (this is safe to transfer)

**How Docker Compose uses `.env`:**
- Docker Compose automatically reads `.env` from the same directory as `docker-compose.yml`
- Variables in `docker-compose.yml` like `${DB_USERNAME}` are replaced with values from `.env`
- Each environment (dev, staging, production) should have its own `.env` file

### Option C: Build on Target System

1. **Transfer only these files/folders:**
   - `backend/Dockerfile`
   - `backend/.dockerignore`
   - `backend/package.json`
   - `backend/package-lock.json`
   - `backend/dist/` (pre-built)
   - `frontend/Dockerfile`
   - `frontend/.dockerignore`
   - `frontend/package.json`
   - `frontend/package-lock.json`
   - `frontend/.next/` (pre-built)
   - `frontend/public/`
   - `frontend/next.config.js`
   - `docker-compose.yml`
   - `.env.example`

2. **On target system:**
   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env with production values
   
   # Build and run
   docker-compose build
   docker-compose up -d
   ```

## Production Checklist

- [ ] Update all environment variables in `.env`
- [ ] Use strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Update `FRONTEND_URL` with production domain
- [ ] Update `NEXT_PUBLIC_API_URL` with production backend URL
- [ ] Configure Google OAuth credentials for production domain
- [ ] Set secure database passwords
- [ ] Review and adjust port mappings if needed
- [ ] Set up SSL/TLS certificates (use reverse proxy like Nginx)
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set up monitoring and alerts

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use secrets management** - Consider Docker secrets or external secret managers
3. **Run containers as non-root** - Already configured in Dockerfiles
4. **Keep images updated** - Regularly update base images and dependencies
5. **Scan for vulnerabilities:**
   ```bash
   docker scan real_estate_estimator-backend:latest
   docker scan real_estate_estimator-frontend:latest
   ```
6. **Use reverse proxy** - Nginx or Traefik for SSL termination
7. **Limit network exposure** - Only expose necessary ports

## Troubleshooting

### Check container status
```bash
docker-compose ps
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Access container shell
```bash
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec postgres psql -U postgres
```

### Rebuild after changes
```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Database migrations
If you need to run migrations, access the backend container:
```bash
docker-compose exec backend sh
# Then run your migration commands
```

## Health Checks

All services include health checks:
- **Backend:** `GET http://localhost:3001/`
- **Frontend:** `GET http://localhost:3000/`
- **PostgreSQL:** `pg_isready`

Check health status:
```bash
docker-compose ps
```

## Stopping and Cleaning Up

```bash
# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Image Sizes

After building, check image sizes:
```bash
docker images | grep real_estate
```

Expected sizes:
- Backend: ~150-200MB (alpine-based)
- Frontend: ~300-400MB (alpine-based)
- PostgreSQL: ~200MB (alpine-based)

## Support

For issues or questions, check:
- Docker logs: `docker-compose logs`
- Container status: `docker-compose ps`
- Health checks: `docker inspect <container_name>`

