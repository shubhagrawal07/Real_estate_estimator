# Quick Setup Guide

## Option 1: Using Docker (Recommended)

### 1. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend
npm install
cp env.example .env
# Edit .env if needed (defaults should work with docker-compose)
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

## Option 2: Local PostgreSQL

### 1. Install and Setup PostgreSQL

Make sure PostgreSQL is installed and running on your machine.

brew services start postgresql


```bash
# Create database
createdb real_estate_db

# Or using psql
psql -U postgres
CREATE DATABASE real_estate_db;
```

### 2. Setup Backend

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your PostgreSQL credentials
npm run start:dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

## Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Troubleshooting

### Database Connection Issues

1. Make sure PostgreSQL is running
2. Check your `.env` file in the backend directory
3. Verify database credentials match your PostgreSQL setup

### Port Already in Use

- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port with `npm run dev -- -p 3001` (or another port)
- Update `FRONTEND_URL` in backend `.env` if you change frontend port

### CORS Errors

Make sure `FRONTEND_URL` in `backend/.env` matches your frontend URL.
