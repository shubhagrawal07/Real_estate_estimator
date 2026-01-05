# Backend Structure

## 📁 Directory Structure

```
src/
├── app.ts                          # Express app configuration
├── server.ts                       # Server startup and entry point
├── routes.ts                       # Mounts all module routes
│
├── config/
│   ├── env.ts                     # Environment configuration
│   └── db.ts                      # Database configuration
│
├── middleware/
│   └── validate.middleware.ts     # Validation middleware
│
└── modules/
    └── property-estimate/
        ├── property-estimate.routes.ts    # Route handlers
        ├── property-estimate.service.ts   # Business logic
        ├── property-estimate.repo.ts      # Database operations
        └── property-estimate.model.ts     # TypeORM entity
```

## 📝 File Responsibilities

### Core Files
- **`app.ts`**: Creates and configures Express app (middleware, CORS, routes)
- **`server.ts`**: Entry point - initializes database and starts server
- **`routes.ts`**: Centralized route mounting for all modules

### Config
- **`config/env.ts`**: Loads and exports environment variables
- **`config/db.ts`**: TypeORM DataSource configuration and initialization

### Middleware
- **`middleware/validate.middleware.ts`**: Request validation for property estimates

### Modules
Each module follows this pattern:
- **`*.routes.ts`**: Express route definitions
- **`*.service.ts`**: Business logic and calculations
- **`*.repo.ts`**: Database operations (repository pattern)
- **`*.model.ts`**: TypeORM entity definition

## 🔄 Data Flow

```
Request → Routes → Middleware (validation) → Service → Repo → Database
                                                      ↓
Response ← Routes ← Service ← Repo ← Database
```

## ✅ Benefits

1. **Modular**: Each feature is self-contained in its module
2. **Separation of Concerns**: Routes, services, and repos are clearly separated
3. **Scalable**: Easy to add new modules following the same pattern
4. **Clean**: No unnecessary folders (dto, entities) - everything in module
5. **Maintainable**: Clear file organization and responsibilities
