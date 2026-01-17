# Database Normalization - 3rd Normal Form (3NF)

## Overview
The property estimate database has been normalized to 3NF to eliminate redundancy, improve data integrity, and support flexible pricing based on property features.

## Schema Changes

### Before (Denormalized)
- Single `property_estimates` table with 20+ boolean columns for criteria, amenities, and parking
- Direct boolean fields: `criteria_calm`, `amenity_air_conditioning`, `parking_garage`, etc.

### After (3NF Normalized)

#### Reference Tables (Master Data)
1. **criteria** - Key location/quality criteria
   - `id` (PK)
   - `code` (unique)
   - `name`
   - `description`
   - `price_impact` (percentage)

2. **amenities** - Property amenities
   - `id` (PK)
   - `code` (unique)
   - `name`
   - `description`
   - `price_impact` (percentage)

3. **parking_types** - Types of parking
   - `id` (PK)
   - `code` (unique)
   - `name`
   - `description`
   - `price_impact` (percentage)

4. **features** - Quick features (layout/space)
   - `id` (PK)
   - `code` (unique)
   - `name`
   - `description`
   - `price_impact` (percentage)

#### Type-Specific Details (One-to-One Relationships)
1. **apartment_details** - Apartment-specific attributes
   - `property_id` (PK, FK → property_estimates.propertyId)
   - `has_elevator` (boolean)
   - `floor_number` (int)
   - `outdoor_space` (enum: none, lt10, gte10)

2. **house_details** - House-specific attributes
   - `property_id` (PK, FK → property_estimates.propertyId)
   - `land_size` (int)
   - `semi_detached` (boolean)
   - `pool_option` (enum: pool, possible, not_possible)

#### Junction Tables (Many-to-Many Relationships)
1. **property_criteria**
   - `property_id` (FK → property_estimates.propertyId)
   - `criteria_id` (FK → criteria.id)
   - Composite PK: (property_id, criteria_id)

2. **property_amenities**
   - `property_id` (FK → property_estimates.propertyId)
   - `amenity_id` (FK → amenities.id)
   - Composite PK: (property_id, amenity_id)

3. **property_parking**
   - `property_id` (FK → property_estimates.propertyId)
   - `parking_type_id` (FK → parking_types.id)
   - Composite PK: (property_id, parking_type_id)

4. **property_features**
   - `property_id` (FK → property_estimates.propertyId)
   - `feature_id` (FK → features.id)
   - Composite PK: (property_id, feature_id)

## Benefits of 3NF

### 1. **Eliminates Update Anomalies**
- Before: To change "Air conditioning" impact from 3% to 5%, must update all properties
- After: Update once in `amenities` table, affects all properties automatically

### 2. **Reduces Data Redundancy**
- Before: Price impact duplicated for every property with same feature
- After: Price impact stored once per feature type

### 3. **Flexible Pricing**
- Before: Hard-coded multipliers in application code
- After: Database-driven pricing allows business users to adjust impacts without code changes

### 4. **Extensibility**
- Before: Adding new feature requires schema migration and code changes
- After: Adding new criteria/amenity is a simple INSERT into reference table

### 5. **Better Queries**
- Easy to find all properties with specific criteria
- Easy to analyze feature popularity
- Simple reporting on feature combinations

### 6. **Type-Specific Data Integrity**
- Before: Mixed nullable columns (apartment_elevator, land_size) in single table
- After: Separate tables ensure apartments can't have land_size and houses can't have floor_number
- Eliminates null-heavy columns and enforces proper data constraints

### 7. **Extensible Property Types**
- Before: Adding new property type (e.g., Land, Commercial) requires many nullable columns
- After: Simply create new type-specific details table with one-to-one relationship

## 3NF Compliance

### First Normal Form (1NF)
✅ All attributes contain atomic values (no arrays or JSON)
✅ Each column contains values of single type
✅ Each column has unique name
✅ Order doesn't matter

### Second Normal Form (2NF)
✅ In 1NF
✅ No partial dependencies (all attributes depend on full primary key)
✅ Junction tables have composite PKs where all attributes depend on both keys

### Third Normal Form (3NF)
✅ In 2NF
✅ No transitive dependencies
✅ Non-key attributes don't depend on other non-key attributes
✅ Price impacts stored in reference tables, not derived from other columns

## Migration Notes

### Automatic Migration (Development)
TypeORM's `synchronize: true` will:
1. Create new reference and junction tables
2. Remove old boolean columns from property_estimates
3. Seed reference data on startup

### Production Migration
For production, create explicit migrations:
```bash
npm run typeorm migration:generate -- -n NormalizePropertyFeatures
npm run typeorm migration:run
```

### Data Migration Script
If you have existing data:
1. Export boolean values from old schema
2. Create reference data entries
3. Map old boolean values to new junction table records
4. Drop old columns

## Code Changes

### Frontend
No changes required - the DTO interface remains the same for backward compatibility.

### Backend Service Layer
- Updated to create junction table records
- Price calculation now queries reference tables for dynamic impacts
- FindOne includes relations to load associated features

### API Response
Properties now include nested relations:

**Apartment Example:**
```json
{
  "propertyId": "uuid",
  "type": "Apartment",
  "area": 70,
  "apartmentDetails": {
    "hasElevator": true,
    "floorNumber": 3,
    "outdoorSpace": "lt10"
  },
  "propertyCriteria": [
    {"criteria": {"code": "calm", "name": "Calm", "priceImpact": 3.0}}
  ],
  "propertyAmenities": [
    {"amenity": {"code": "air_conditioning", "name": "Air conditioning", "priceImpact": 3.0}}
  ],
  "propertyParking": [
    {"parkingType": {"code": "garage", "name": "Garage", "priceImpact": 15.0}}
  ],
  "propertyFeatures": [
    {"feature": {"code": "double_living_room", "name": "Double living room", "priceImpact": 4.0}}
  ]
}
```

**House Example:**
```json
{
  "propertyId": "uuid",
  "type": "House",
  "area": 150,
  "houseDetails": {
    "landSize": 500,
    "semiDetached": false,
    "poolOption": "possible"
  },
  "propertyCriteria": [...],
  "propertyAmenities": [...],
  "propertyParking": [...],
  "propertyFeatures": [...]
}
```

## Reference Data

### Seeded Criteria
- calm (3% impact)
- bright (2.5% impact)
- near_amenities (5% impact)
- no_vis_a_vis (4% impact)
- well_connected (6% impact)

### Seeded Amenities
- air_conditioning (3% impact)
- modern_bathroom (4% impact)
- recent_kitchen (5% impact)
- fireplace (2% impact)

### Seeded Parking Types
- garage (15% impact)
- private (10% impact)
- shared (5% impact)
- street (0% impact)

### Seeded Features
- double_living_room (4% impact)
- open_kitchen (3.5% impact)
- laundry_cellar (2.5% impact)

## Performance Considerations

### Indexes
Junction tables use composite primary keys which are automatically indexed.

### Query Optimization
- Use eager loading in TypeORM to prevent N+1 queries
- Junction tables are small and highly performant
- Consider caching reference data in application memory

### Trade-offs
- Slight increase in query complexity (JOINs required)
- Negligible performance impact for typical usage
- Major gains in maintainability and data integrity

## Complete Normalized Database Structure

```
┌─────────────────────────┐
│  property_estimates     │ ← Main table (common fields)
│  ──────────────────────│
│  - propertyId (PK)     │
│  - type (enum)         │
│  - area, bedrooms, etc │
└───────┬─────────────────┘
        │
        ├──────────────────────┐
        │                      │
        ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ apartment_details│   │  house_details   │  ← Type-specific (1:1)
│ ─────────────────│   │ ─────────────────│
│ - property_id(PK)│   │ - property_id(PK)│
│ - has_elevator   │   │ - land_size      │
│ - floor_number   │   │ - semi_detached  │
│ - outdoor_space  │   │ - pool_option    │
└──────────────────┘   └──────────────────┘

┌──────────────────────────────────────────────────────────┐
│              Feature Relationships (M:N)                  │
└──────────────────────────────────────────────────────────┘

        ┌──────────────────┐
        │  criteria        │ ← Reference data
        │ ─────────────────│
        │ - id (PK)        │
        │ - code           │
        │ - price_impact   │
        └────────┬─────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ property_criteria   │ ← Junction table
        │ ────────────────────│
        │ - property_id (PK)  │
        │ - criteria_id (PK)  │
        └─────────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  property_estimates    │
        └────────────────────────┘

(Similar structure for amenities, parking_types, and features)

### Key Design Principles

1. **Common attributes** → `property_estimates` table
2. **Type-specific attributes** → `apartment_details` or `house_details` (1:1)
3. **Repeatable features** → Junction tables (M:N) + Reference tables
4. **Pricing metadata** → Reference tables (criteria, amenities, parking_types)

### Relationship Rules

- Each property has **exactly one** type (Apartment OR House)
- Each property has **zero or one** apartment_details (if type = Apartment)
- Each property has **zero or one** house_details (if type = House)
- Each property can have **many** criteria, amenities, and parking types
- Each criteria/amenity/parking type can belong to **many** properties

