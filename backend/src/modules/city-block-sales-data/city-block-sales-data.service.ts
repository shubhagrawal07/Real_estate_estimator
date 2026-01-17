import { FetchDataParams, SectionMap } from './types';
import { fetchAndProcessData } from './api.service';
import { CityBlockSalesDataRepo } from './city-block-sales-data.repo';

/**
 * Main service function that fetches and processes data
 * Takes anneemut_min, anneemut_max and code_insee as input
 * Returns the map with section key and mansion, apartment total data
 * Also saves the data to the database
 */
export async function processRealEstateData(
  params: FetchDataParams
): Promise<SectionMap> {
  const { anneemut_min, anneemut_max, code_insee } = params;

  console.log('Starting real estate data processing...');
  console.log(`Parameters:`, {
    anneemut_min,
    anneemut_max,
    code_insee,
  });

  try {
    // Fetch and process data from API
    const result = await fetchAndProcessData({
      anneemut_min,
      anneemut_max,
      code_insee,
    });

    console.log('Data processing completed successfully.');
    console.log(`Total sections processed: ${Object.keys(result).length}`);

    // Save to database
    await saveToDatabase(result, code_insee, anneemut_min, anneemut_max);

    return result;
  } catch (error) {
    console.error('Error processing real estate data:', error);
    throw error;
  }
}

/**
 * Save processed data to the database
 */
async function saveToDatabase(
  sectionMap: SectionMap,
  codeInsee: string,
  anneemutMin: number,
  anneemutMax: number
): Promise<void> {
  const repo = new CityBlockSalesDataRepo();
  const dataToSave = [];

  for (const [idpar, entry] of Object.entries(sectionMap)) {
    const apartmentData = entry.data[0];
    const mansionData = entry.data[1];

    dataToSave.push({
      idpar: idpar,
      anneemutMin: anneemutMin,
      anneemutMax: anneemutMax,
      apartmentCount: apartmentData.count,
      apartmentSbati: apartmentData.sbati,
      apartmentSterr: apartmentData.sterr,
      apartmentPrice: apartmentData.valeurfonc,
      mansionCount: mansionData.count,
      mansionSbati: mansionData.sbati,
      mansionSterr: mansionData.sterr,
      mansionPrice: mansionData.valeurfonc,
    });
  }

  if (dataToSave.length > 0) {
    console.log(`Saving ${dataToSave.length} records to database...`);
    await repo.upsertMany(dataToSave);
    console.log('✅ Data saved to database successfully.');
  } else {
    console.log('No data to save to database.');
  }
}
