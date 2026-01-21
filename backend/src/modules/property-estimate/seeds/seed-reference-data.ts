import { AppDataSource } from '../../../config/db';
import { Criteria } from '../entities/criteria.model';
import { Amenity } from '../entities/amenity.model';
import { ParkingType } from '../entities/parking-type.model';
import { Feature } from '../entities/feature.model';

export async function seedReferenceData() {
  const criteriaRepo = AppDataSource.getRepository(Criteria);
  const amenityRepo = AppDataSource.getRepository(Amenity);
  const parkingRepo = AppDataSource.getRepository(ParkingType);
  const featureRepo = AppDataSource.getRepository(Feature);

  // Seed Criteria
  const criteriaData = [
    { code: 'calm', name: 'Calm', description: 'Quiet neighborhood', priceImpact: 3.0 },
    { code: 'bright', name: 'Bright', description: 'Good natural lighting', priceImpact: 2.5 },
    { code: 'near_amenities', name: 'Near amenities', description: 'Close to shops and services', priceImpact: 5.0 },
    { code: 'no_vis_a_vis', name: 'No vis-à-vis', description: 'Privacy from neighbors', priceImpact: 4.0 },
    { code: 'well_connected', name: 'Well connected', description: 'Good public transport access', priceImpact: 6.0 },

  ];

  for (const data of criteriaData) {
    const existing = await criteriaRepo.findOne({ where: { code: data.code } });
    if (!existing) {
      await criteriaRepo.save(criteriaRepo.create(data));
    }
  }

  // Seed Amenities
  const amenityData = [
    { code: 'air_conditioning', name: 'Air conditioning', description: 'Central or individual AC', priceImpact: 3.0 },
    { code: 'modern_bathroom', name: 'Modern bathroom', description: 'Recently renovated bathroom', priceImpact: 4.0 },
    { code: 'recent_kitchen', name: 'Recent equipped kitchen', description: 'Modern fitted kitchen', priceImpact: 5.0 },
    { code: 'fireplace', name: 'Fireplace or stove', description: 'Wood or pellet heating', priceImpact: 2.0 },
    { code: 'electricity_standard', name: 'Electricity up to standard', description: 'Electrical installation meets current standards', priceImpact: 2.5 },
    { code: 'double_triple_glazing', name: 'Double / triple glazing', description: 'Energy-efficient windows with double or triple glazing', priceImpact: 3.5 },
  ];

  for (const data of amenityData) {
    const existing = await amenityRepo.findOne({ where: { code: data.code } });
    if (!existing) {
      await amenityRepo.save(amenityRepo.create(data));
    }
  }

  // Seed Parking Types
  const parkingData = [
    { code: 'garage', name: 'Garage', description: 'Private enclosed garage', priceImpact: 15.0 },
    { code: 'private', name: 'Private parking spot', description: 'Dedicated parking space', priceImpact: 10.0 },
    { code: 'shared', name: 'Shared parking', description: 'Common parking area', priceImpact: 5.0 },
    { code: 'street', name: 'Street parking', description: 'Public street parking', priceImpact: 0.0 },
  ];

  for (const data of parkingData) {
    const existing = await parkingRepo.findOne({ where: { code: data.code } });
    if (!existing) {
      await parkingRepo.save(parkingRepo.create(data));
    }
  }

  // Seed Features (quick features from form page 2)
  const featureData = [
    { code: 'double_living_room', name: 'Double living room', description: 'Spacious double living area', priceImpact: 4.0 },
    { code: 'open_kitchen', name: 'Open kitchen', description: 'Open-plan kitchen layout', priceImpact: 3.5 },
    { code: 'laundry_cellar', name: 'Laundry / cellar', description: 'Dedicated laundry room or cellar space', priceImpact: 2.5 },
  ];

  for (const data of featureData) {
    const existing = await featureRepo.findOne({ where: { code: data.code } });
    if (!existing) {
      await featureRepo.save(featureRepo.create(data));
    }
  }

  console.log('Reference data seeded successfully');
}

