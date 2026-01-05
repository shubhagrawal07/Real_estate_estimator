# Database Setup Guide

## Error: PostgreSQL Connection Failed

If you're seeing `ECONNREFUSED` errors, PostgreSQL is not running. Follow one of these options:

## Option 1: Using Docker (Recommended - Easiest)

```bash
# From project root
cd /Users/shubhagrawal/realEstate_estimator
docker-compose up -d

# Verify it's running
docker-compose ps
```

This will:
- Start PostgreSQL in a container
- Create the database automatically
- Use default credentials (postgres/postgres)

## Option 2: Install PostgreSQL Locally (macOS)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create the database
createdb real_estate_db

# Or using psql
psql -U postgres
CREATE DATABASE real_estate_db;
\q
```

## Option 3: Use Existing PostgreSQL

If you already have PostgreSQL installed:

1. Make sure it's running:
   ```bash
   # Check if running
   pg_isready
   
   # Or start it
   brew services start postgresql@15
   ```

2. Update `backend/.env` with your credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_username  # Use your system username (e.g., shubhagrawal)
   DB_PASSWORD=               # Leave empty if no password is set
   DB_NAME=real_estate_db
   ```
   
   **Note**: If you created the database with your system username (e.g., `psql -U shubhagrawal`), 
   use that username in `DB_USERNAME`. If no password is required, leave `DB_PASSWORD` empty.

3. Create the database:
   ```bash
   createdb real_estate_db
   ```

## Verify Setup

After starting PostgreSQL, restart the backend:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ Server is running on http://localhost:3001
```

## Troubleshooting

### Port 5432 already in use
- Another PostgreSQL instance might be running
- Check: `lsof -i :5432`
- Stop conflicting service or change port in `.env`

### Authentication failed
- Check username/password in `backend/.env`
- Default: username=`postgres`, password=`postgres`

### Database doesn't exist
- Create it: `createdb real_estate_db`
- Or: `psql -U postgres -c "CREATE DATABASE real_estate_db;"`
