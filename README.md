# Real Estate Price Estimator

A full-stack application for estimating real estate property market values. Built with Express (backend), Next.js (frontend), and PostgreSQL (database).

## Features

- **Property Estimation**: Enter property details to get an instant market value estimate
- **Modern UI**: Beautiful, responsive landing page with gradient design
- **RESTful API**: Clean backend API with validation and error handling
- **Database Integration**: PostgreSQL database to store property estimates
- **Real Estate Data Processing**: Fetch and process real estate mutation data from French DVF API
- **User Management**: User accounts with roles (user/agent/admin)
- **Zone Management**: Zone assignment system for agents
- **Subscription System**: Trial, basic, and pro subscription tiers

## Tech Stack

### Backend
- **Express**: Fast, unopinionated web framework for Node.js
- **TypeORM**: ORM for PostgreSQL
- **PostgreSQL**: Relational database
- **TypeScript**: Type-safe development

### Frontend
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **CSS Modules**: Scoped styling

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher) OR Docker
- npm or yarn

## Quick Start

### Option 1: Using Docker (Recommended)

#### 1. Start PostgreSQL with Docker

```bash
# From project root
docker-compose up -d

# Verify it's running
docker-compose ps
```

This will:
- Start PostgreSQL in a container
- Create the database automatically
- Use default credentials (postgres/postgres)

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp env.example .env

# Edit .env if needed (defaults should work with docker-compose)
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_NAME=real_estate_db
# PORT=3001

# Start development server
npm run dev
```

The backend will run on `http://localhost:3001`

#### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### Option 2: Local PostgreSQL

#### 1. Install and Setup PostgreSQL

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb real_estate_db

# Or using psql
psql -U postgres
CREATE DATABASE real_estate_db;
\q
```

**Linux:**
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb real_estate_db
```

**Windows:**
- Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
- Use pgAdmin or psql to create database: `CREATE DATABASE real_estate_db;`

#### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp env.example .env

# Edit .env with your PostgreSQL credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=your_username
# DB_PASSWORD=your_password
# DB_NAME=real_estate_db
# PORT=3001

# Start development server
npm run dev
```

#### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
realEstate_estimator/
├── backend/                    # Express API Server
│   ├── src/
│   │   ├── server.ts          # Application entry point
│   │   ├── app.ts             # Express app configuration
│   │   ├── routes.ts          # Mounts all module routes
│   │   ├── config/
│   │   │   ├── env.ts        # Environment configuration
│   │   │   └── db.ts         # Database configuration
│   │   ├── middleware/
│   │   │   └── validate.middleware.ts  # Validation middleware
│   │   └── modules/
│   │       ├── user/          # User module
│   │       │   └── user.model.ts
│   │       ├── property-estimate/  # Property estimate module
│   │       │   ├── property-estimate.routes.ts
│   │       │   ├── property-estimate.service.ts
│   │       │   ├── property-estimate.repo.ts
│   │       │   └── property-estimate.model.ts
│   │       ├── zone/          # Zone module
│   │       │   └── zone.model.ts
│   │       ├── subscription/  # Subscription module
│   │       │   └── subscription.model.ts
│   │       ├── real-estate-data/  # Real estate data processing module
│   │       │   ├── real-estate-data.routes.ts
│   │       │   ├── real-estate-data.service.ts
│   │       │   ├── api.service.ts
│   │       │   ├── data-processor.service.ts
│   │       │   └── types.ts
│   │       └── city-block-sales-data/  # City block sales data module
│   │           ├── city-block-sales-data.model.ts
│   │           └── city-block-sales-data.repo.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── env.example
├── frontend/                   # Next.js React App
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx          # Landing page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   │   ├── PropertyEstimateForm.tsx
│   │   └── EstimateResult.tsx
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml         # PostgreSQL setup
└── README.md
```

## Database Schema

### Users
- `userId`: UUID (primary key)
- `username`: string (required)
- `role`: enum (user/agent/admin)
- `emailId`: string (optional)
- `phoneNo`: bigint (optional)
- `createdDate`: date

### Property Estimates
- `propertyId`: UUID (primary key)
- `userId`: UUID (foreign key to Users, optional)
- `address`: string (required)
- `postalCode`: int (required)
- `department`: string (required)
- `municipality`: string (required)
- `cadastralSection`: string (required)
- `impressions`: int (optional)
- `estimatedPrice`: int (optional)
- `createdDate`: date
- `condition`: string (optional)
- `type`: enum (Apartment/House)
- `area`: int (required)
- `bedrooms`: int (default: 1)
- `bathrooms`: int (default: 1)
- `floors`: int (default: 1)
- `hasBalcony`: boolean (default: false)
- `hasParking`: boolean (default: false)
- `ownershipType`: enum (Owner/tenant, default: Owner)
- `deadline`: enum (immediate/not immediate, default: not immediate)
- `status`: enum (draft/new/sold)

### Zones
- `zoneId`: UUID (primary key)
- `zoneCode`: string (required)
- `status`: enum (Assigned/available, default: available)
- `agentId`: UUID (foreign key to Users, optional)

### Subscriptions
- `id`: UUID (primary key)
- `userId`: UUID (foreign key to Users, required)
- `subscriptionType`: enum (trial/basic/pro)
- `status`: enum (active/expired/pending)
- `startDate`: date (optional)
- `endDate`: date (optional)
- `paymentStatus`: enum (paid/pending)
- `netAmountPaid`: int (required)

### City Block Sales Data
- `id`: UUID (primary key)
- `department`: VARCHAR(10) - Department code (from DVF API)
- `code_insee`: VARCHAR(10) - INSEE code (municipality identifier)
- `section`: VARCHAR(10) - Cadastral section code
- `anneemut_min`: INT - Minimum mutation year
- `anneemut_max`: INT - Maximum mutation year
- `apartment_count`: INT - Number of apartments in this section
- `apartment_sbati`: NUMERIC - Total built area for apartments (m²)
- `apartment_sterr`: NUMERIC - Total land area for apartments (m²)
- `apartment_price`: NUMERIC - Total property value for apartments (€)
- `mansion_count`: INT - Number of mansions in this section
- `mansion_sbati`: NUMERIC - Total built area for mansions (m²)
- `mansion_sterr`: NUMERIC - Total land area for mansions (m²)
- `mansion_price`: NUMERIC - Total property value for mansions (€)
- `last_modified_date`: TIMESTAMP - Last update timestamp (auto-updated)

**Unique Constraint**: `(code_insee, section)` - ensures one record per section per municipality.

## API Endpoints

### POST /property-estimate
Create a new property estimate.

**Request Body:**
```json
{
  "address": "123 Main St",
  "postalCode": 10001,
  "department": "New York",
  "municipality": "Manhattan",
  "cadastralSection": "Section A",
  "type": "Apartment",
  "area": 1500,
  "bedrooms": 3,
  "bathrooms": 2,
  "floors": 1,
  "hasBalcony": true,
  "hasParking": false,
  "ownershipType": "Owner",
  "deadline": "not immediate",
  "status": "new"
}
```

**Response:**
```json
{
  "propertyId": "uuid",
  "address": "123 Main St",
  "postalCode": 10001,
  "estimatedPrice": 450000,
  "createdDate": "2024-01-01T00:00:00.000Z"
}
```

### GET /property-estimate
Get all property estimates.

### GET /property-estimate/:id
Get a specific property estimate by ID.

### POST /process-data
Process real estate mutation data from French DVF API and save to database.

**Request Body:**
```json
{
  "anneemut_min": 2020,
  "anneemut_max": 2023,
  "code_insee": "83137"
}
```

**Parameters:**
- `anneemut_min` (number, required): Minimum mutation year (e.g., 2020)
- `anneemut_max` (number, required): Maximum mutation year (e.g., 2023)
- `code_insee` (string, required): INSEE code (French municipality identifier, e.g., "83137" for Toulon)

**Response:**
```json
{
  "success": true,
  "data": {
    "BE": [
      {
        "sterr": 500,
        "sbati": 1200,
        "valeurfonc": 250000,
        "count": 5
      },
      {
        "sterr": 800,
        "sbati": 2000,
        "valeurfonc": 450000,
        "count": 3
      }
    ]
  },
  "sectionsCount": 1,
  "message": "Data processed and saved to database successfully"
}
```

**What it does:**
1. Fetches real estate mutation data from the DVF OpenData API
2. Processes and aggregates data by cadastral sections
3. Categorizes properties into apartments and mansions
4. Saves aggregated data to `city_block_sales_data` table
5. Returns the processed data in the response

**Note**: The data is automatically saved to the database. Each section record is created or updated (upsert) based on the unique combination of `code_insee` and `section`.

## Price Calculation

The estimation algorithm considers:
- Base price per square foot
- City/location multipliers
- Number of bedrooms
- Number of bathrooms
- Property age (year built)
- Property type and condition

**Note**: This is a simplified calculation. In production, you would integrate with real estate APIs, ML models, or market data services.

## Development

### Backend Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Frontend Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

### Data Flow
```
Request → Routes → Middleware (validation) → Service → Repo → Database
                                                      ↓
Response ← Routes ← Service ← Repo ← Database
```

### Module Structure
Each module follows this pattern:
- **`*.routes.ts`**: Express route definitions
- **`*.service.ts`**: Business logic and calculations
- **`*.repo.ts`**: Database operations (repository pattern)
- **`*.model.ts`**: TypeORM entity definition

## Troubleshooting

### Database Connection Issues

1. **PostgreSQL not running:**
   ```bash
   # Check if running
   pg_isready
   
   # Start PostgreSQL (macOS)
   brew services start postgresql@15
   
   # Or use Docker
   docker-compose up -d
   ```

2. **Check your `.env` file** in the backend directory:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=real_estate_db
   ```

3. **Verify database credentials** match your PostgreSQL setup

### Port Already in Use

- **Backend**: Change `PORT` in `backend/.env`
- **Frontend**: Change port with `npm run dev -- -p 3001` (or another port)
- **Update `FRONTEND_URL`** in backend `.env` if you change frontend port

### CORS Errors

Make sure `FRONTEND_URL` in `backend/.env` matches your frontend URL (default: `http://localhost:3000`).

### Authentication Failed

- Check username/password in `backend/.env`
- Default Docker credentials: username=`postgres`, password=`postgres`
- For local PostgreSQL, use your system username if no password is set

### Database Doesn't Exist

```bash
# Create database
createdb real_estate_db

# Or using psql
psql -U postgres -c "CREATE DATABASE real_estate_db;"
```

### Port 5432 Already in Use

- Another PostgreSQL instance might be running
- Check: `lsof -i :5432`
- Stop conflicting service or change port in `.env`

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## License

MIT
