# Batch Job - Real Estate Data Processing Service

A REST API service that fetches and processes real estate mutation data from the French government's DVF (Demandes de Valeurs Foncières) API. It aggregates property data by cadastral sections, categorizing properties into apartments and mansions.

## Overview

The batchJob service:
1. **Fetches** real estate mutation data from the DVF OpenData API
2. **Processes** the data to extract and aggregate property information
3. **Groups** properties by cadastral sections (e.g., "BE", "AC", etc.)
4. **Categorizes** properties as either apartments or mansions
5. **Aggregates** metrics: land area (sterr), built area (sbati), property value (valeurfonc), and count
6. **Stores** the processed data in PostgreSQL database (`city_block_sales_data` table)

## How It Works

### Architecture Flow

```
Client Request
    ↓
POST /process-data
    ↓
real-estate-data.routes.ts (validates input)
    ↓
real-estate-data.service.ts (orchestrates processing)
    ↓
api.service.ts (fetches data from DVF API with pagination)
    ↓
data-processor.service.ts (processes and aggregates data)
    ↓
city-block-sales-data.repo.ts (saves to database)
    ↓
Returns SectionMap (organized by section → [apartment, mansion])
```

### Data Processing Steps

1. **API Fetching** (`api.service.ts`):
   - Builds API URL with query parameters (anneemut_min, anneemut_max, code_insee)
   - Fetches data from `https://apidf-preprod.cerema.fr/dvf_opendata/mutations/`
   - Handles pagination automatically (follows `next` links until all pages are fetched)

2. **Data Processing** (`data-processor.service.ts`):
   - Extracts section code from `l_idpar` (e.g., "83137000BE0330" → "BE")
   - Filters properties by type (only processes "APPARTEMENT" and "MAISON")
   - Aggregates metrics per section:
     - **sterr**: Total land area (surface terrain)
     - **sbati**: Total built area (surface bâtie)
     - **valeurfonc**: Total property value (valeur foncière)
     - **count**: Number of properties

3. **Data Structure**:
   - Each section has an array of 2 objects: `[apartment, mansion]`
   - Index 0 = Apartment data
   - Index 1 = Mansion data

### Example Output Structure

```json
{
  "BE": [
    { "sterr": 500, "sbati": 1200, "valeurfonc": 250000, "count": 5 },  // apartments
    { "sterr": 800, "sbati": 2000, "valeurfonc": 450000, "count": 3 }   // mansions
  ],
  "AC": [
    [
      { "sterr": 300, "sbati": 800, "valeurfonc": 180000, "count": 4 },
      { "sterr": 600, "sbati": 1500, "valeurfonc": 320000, "count": 2 }
    ]
  ]
}
```

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher) - Same database as the main backend application

## Step-by-Step Setup

### 1. Navigate to batchJob Directory

```bash
cd batchJob
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `typeorm` - ORM for database operations
- `pg` - PostgreSQL client
- TypeScript and development tools

### 3. Configure Environment

Create a `.env` file in the `batchJob` directory:

```env
# Server Configuration
PORT=3002
NODE_ENV=development

# Database Configuration (same as backend)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=real_estate_db
```

**Note**: The service uses the same database as the main backend application. Make sure PostgreSQL is running and the database exists.

### 4. Build the Project (Production)

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 5. Run the Service

#### Development Mode (with hot reload)

```bash
npm run dev
```

This uses `ts-node-dev` to run TypeScript directly with automatic restarts on file changes.

#### Production Mode

```bash
# First build
npm run build

# Then start
npm start
```

The service will start on `http://localhost:3002` (or the port specified in `.env`).

### 6. Verify It's Running

Open your browser or use curl:

```bash
curl http://localhost:3002/
```

You should see:
```json
{
  "message": "Real Estate Data Processing API is running!"
}
```

## How to Use the API

### Endpoint

**POST** `http://localhost:3002/process-data`

### Request Body

```json
{
  "anneemut_min": 2020,
  "anneemut_max": 2023,
  "code_insee": "83137"
}
```

#### Parameters

- **`anneemut_min`** (number, required): Minimum mutation year (e.g., 2020)
- **`anneemut_max`** (number, required): Maximum mutation year (e.g., 2023)
- **`code_insee`** (string, required): INSEE code (French municipality identifier, e.g., "83137" for Toulon)

### Example Request

Using **curl**:

```bash
curl -X POST http://localhost:3002/process-data \
  -H "Content-Type: application/json" \
  -d '{
    "anneemut_min": 2020,
    "anneemut_max": 2023,
    "code_insee": "83137"
  }'
```

Using **JavaScript/TypeScript**:

```typescript
const response = await fetch('http://localhost:3002/process-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    anneemut_min: 2020,
    anneemut_max: 2023,
    code_insee: '83137',
  }),
});

const result = await response.json();
console.log(result);
```

Using **Postman** or **Insomnia**:
1. Set method to `POST`
2. URL: `http://localhost:3002/process-data`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "anneemut_min": 2020,
  "anneemut_max": 2023,
  "code_insee": "83137"
}
```

### Response Format

#### Success Response (200)

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
    ],
    "AC": [
      {
        "sterr": 300,
        "sbati": 800,
        "valeurfonc": 180000,
        "count": 4
      },
      {
        "sterr": 600,
        "sbati": 1500,
        "valeurfonc": 320000,
        "count": 2
      }
    ]
  },
  "sectionsCount": 2
}
```

#### Error Responses

**400 Bad Request** - Missing or invalid parameters:
```json
{
  "message": "Missing required parameters",
  "required": ["anneemut_min", "anneemut_max", "code_insee"]
}
```

**500 Internal Server Error** - API fetch or processing error:
```json
{
  "message": "Failed to process data",
  "error": "API request failed: 404 Not Found"
}
```

## Database Storage

The processed data is automatically saved to the `city_block_sales_data` table in PostgreSQL. Each section gets a database record that is created or updated (upsert) based on the unique combination of `code_insee` and `section`.

### Database Table Schema

**Table**: `city_block_sales_data`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `department` | VARCHAR(10) | Department code (from API `coddep` field) |
| `code_insee` | VARCHAR(10) | INSEE code (municipality identifier) |
| `section` | VARCHAR(10) | Cadastral section code (e.g., "BE", "AC") |
| `apartment_count` | INT | Number of apartments in this section |
| `apartment_sbati` | NUMERIC | Total built area for apartments (m²) |
| `apartment_sterr` | NUMERIC | Total land area for apartments (m²) |
| `apartment_price` | NUMERIC | Total property value for apartments (€) |
| `mansion_count` | INT | Number of mansions in this section |
| `mansion_sbati` | NUMERIC | Total built area for mansions (m²) |
| `mansion_sterr` | NUMERIC | Total land area for mansions (m²) |
| `mansion_price` | NUMERIC | Total property value for mansions (€) |
| `last_modified_date` | TIMESTAMP | Last update timestamp (auto-updated) |

**Unique Constraint**: `(code_insee, section)` - ensures one record per section per municipality.

### Upsert Behavior

- If a record with the same `code_insee` and `section` exists, it will be **updated** with new values
- If no matching record exists, a **new record** will be created
- The `last_modified_date` is automatically updated on each save

## Understanding the Response

### Section Map Structure

The `data` object is a map where:
- **Key**: Cadastral section code (e.g., "BE", "AC", "AD")
- **Value**: Array of 2 objects:
  - `[0]`: Apartment data
  - `[1]`: Mansion data

### Property Data Fields

Each property data object contains:
- **`sterr`**: Total land area (surface terrain) in square meters
- **`sbati`**: Total built area (surface bâtie) in square meters
- **`valeurfonc`**: Total property value (valeur foncière) in euros
- **`count`**: Number of properties in this category

### Example Interpretation

```json
"BE": [
  { "sterr": 500, "sbati": 1200, "valeurfonc": 250000, "count": 5 },  // 5 apartments
  { "sterr": 800, "sbati": 2000, "valeurfonc": 450000, "count": 3 }   // 3 mansions
]
```

This means:
- **Section BE** has:
  - **5 apartments** with total land area 500 m², built area 1200 m², value 250,000€
  - **3 mansions** with total land area 800 m², built area 2000 m², value 450,000€

## Finding INSEE Codes

INSEE codes are 5-digit codes identifying French municipalities. Examples:
- `83137` - Toulon
- `75056` - Paris
- `13055` - Marseille
- `69029` - Lyon

You can find INSEE codes at:
- [INSEE Official Website](https://www.insee.fr/)
- [French Wikipedia](https://fr.wikipedia.org/wiki/Liste_des_communes_de_France_les_plus_peuplées)

## Troubleshooting

### Port Already in Use

If port 3002 is already in use:

```bash
# Find the process using the port
lsof -ti:3002

# Kill the process
lsof -ti:3002 | xargs kill -9

# Or change the port in .env
PORT=3003
```

### API Request Fails

1. **Check internet connection** - The service fetches data from an external API
2. **Verify INSEE code** - Make sure the code_insee is valid
3. **Check year range** - Ensure anneemut_min <= anneemut_max
4. **Check API availability** - The DVF API might be temporarily unavailable

### No Data Returned

- The API might not have data for the specified parameters
- Try a different year range or INSEE code
- Check the console logs for detailed error messages

### TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Development

### Project Structure

```
batchJob/
├── src/
│   ├── server.ts                    # Server entry point
│   ├── app.ts                       # Express app configuration
│   ├── routes.ts                    # Route mounting
│   ├── config/
│   │   └── env.ts                  # Environment configuration
│   └── modules/
│       └── real-estate-data/
│           ├── real-estate-data.routes.ts    # API routes
│           ├── real-estate-data.service.ts   # Main service
│           ├── api.service.ts                # API fetching logic
│           ├── data-processor.service.ts     # Data processing logic
│           └── types.ts                     # TypeScript types
├── dist/                            # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server (requires build first)
- `npm run lint` - Run ESLint

### Adding New Features

1. **Add new routes**: Edit `real-estate-data.routes.ts` or create new route files
2. **Add business logic**: Edit or create service files in `modules/`
3. **Add types**: Update `types.ts` or create new type files

## API Rate Limits

The DVF API may have rate limits. If you encounter rate limiting:
- Add delays between requests
- Implement request queuing
- Cache results for frequently requested parameters

## License

MIT
