# Real Estate Price Estimator

A full-stack application for estimating real estate property market values. Built with Express (backend), Next.js (frontend), and PostgreSQL (database).

## Features

- **Property Estimation**: Enter property details to get an instant market value estimate
- **Modern UI**: Beautiful, responsive landing page with gradient design
- **RESTful API**: Clean backend API with validation and error handling
- **Database Integration**: PostgreSQL database to store property estimates

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
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Database Setup

Create a PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE real_estate_db;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from env.example)
cp env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_NAME=real_estate_db
# PORT=3001

# Start development server
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
realEstate_estimator/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── main.ts
│   │   └── property-estimate/
│   │       ├── property-estimate.routes.ts
│   │       ├── property-estimate.service.ts
│   │       ├── property-estimate.validator.ts
│   │       └── entities/
│   │           └── property-estimate.entity.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── PropertyEstimateForm.tsx
│   │   └── EstimateResult.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## API Endpoints

### POST /property-estimate
Create a new property estimate.

**Request Body:**
```json
{
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "squareFeet": 1500,
  "bedrooms": 3,
  "bathrooms": 2,
  "yearBuilt": 2000
}
```

**Response:**
```json
{
  "id": 1,
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "squareFeet": 1500,
  "bedrooms": 3,
  "bathrooms": 2,
  "yearBuilt": 2000,
  "estimatedPrice": 450000,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /property-estimate
Get all property estimates.

### GET /property-estimate/:id
Get a specific property estimate by ID.

## Price Calculation

The estimation algorithm considers:
- Base price per square foot
- City/location multipliers
- Number of bedrooms
- Number of bathrooms
- Property age (year built)

Note: This is a simplified calculation. In production, you would integrate with real estate APIs, ML models, or market data services.

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

## License

MIT
