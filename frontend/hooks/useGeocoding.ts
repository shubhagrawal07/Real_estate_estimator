'use client';

import { useState, useCallback } from 'react';

const GEOCODE_API_BASE = 'https://data.geopf.fr/geocodage';

export interface AddressSuggestion {
  label: string;
  id: string;
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    citycode?: string;
    postcode?: string;
    city?: string;
    context?: string;
  };
}

export interface ParcelData {
  properties: {
    section?: string;
    departmentcode?: string;
    municipalitycode?: string;
  };
}

export interface GeocodingResult {
  address: string;
  postalCode: number;
  citycode?: string;
  coordinates: {
    lon: number;
    lat: number;
  };
  locationCode?: string; // Format: {code_insee}{cadastral_section} e.g., "83137BY"
  department?: string;
  municipality?: string;
  cadastralSection?: string;
}

export function useGeocoding() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${GEOCODE_API_BASE}/search?index=address&autocomplete=true&q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && Array.isArray(data.features)) {
        interface GeocodeFeature {
          id?: string;
          geometry?: { coordinates: [number, number] };
          properties?: {
            label?: string;
            name?: string;
            citycode?: string;
            postcode?: string;
            city?: string;
            context?: string;
          };
        }
        const addressSuggestions: AddressSuggestion[] = data.features.map((feature: GeocodeFeature) => ({
          label: feature.properties?.label || feature.properties?.name || '',
          id: feature.id || feature.properties?.citycode || '',
          geometry: feature.geometry ?? { coordinates: [0, 0] },
          properties: {
            citycode: feature.properties?.citycode,
            postcode: feature.properties?.postcode,
            city: feature.properties?.city || feature.properties?.name,
            context: feature.properties?.context,
          },
        }));

        setSuggestions(addressSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Geocoding search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search addresses');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getParcelData = useCallback(async (lon: number, lat: number): Promise<ParcelData | null> => {
    try {
      const response = await fetch(
        `${GEOCODE_API_BASE}/reverse?index=parcel&lon=${lon}&lat=${lat}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Parcel data might not always be available, so we don't throw
        console.warn(`Parcel reverse geocoding failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0];
      }

      return null;
    } catch (err) {
      console.error('Parcel lookup error:', err);
      return null;
    }
  }, []);

  const selectAddress = useCallback(async (suggestion: AddressSuggestion): Promise<GeocodingResult> => {
    setLoading(true);
    setError(null);

    try {
      const [lon, lat] = suggestion.geometry.coordinates;
      const citycode = suggestion.properties.citycode || '';
      const postcode = suggestion.properties.postcode || '';

      // Extract department from citycode (first 2-3 digits)
      let department = 'Unknown';
      if (citycode) {
        // For metropolitan France, first 2 digits are the department
        // For DOM-TOM (overseas), it can be 3 digits
        const deptCode = citycode.length >= 2 ? citycode.substring(0, 2) : '';
        department = deptCode || 'Unknown';
      }

      // Get municipality from city property or use default
      const municipality = suggestion.properties.city || 'Unknown';

      // Try to get parcel data for cadastral section
      let cadastralSection = '00';
      const parcelData = await getParcelData(lon, lat);
      
      if (parcelData && parcelData.properties) {
        // Extract cadastral section from parcel data
        if (parcelData.properties.section) {
          cadastralSection = parcelData.properties.section.toUpperCase().padEnd(2, '0').substring(0, 2);
        }
        
        // If department wasn't extracted from citycode, try parcel data
        if (department === 'Unknown' && parcelData.properties.departmentcode) {
          department = parcelData.properties.departmentcode;
        }
        
        // Update municipality from parcel if available
        if (municipality === 'Unknown' && parcelData.properties.municipalitycode) {
          // Municipality code is typically different from name, but we keep the name from address
        }
      }

      // Generate locationCode: {code_insee}{padding}{cadastral_section}
      // Format: 83137000BY (code_insee: 5 digits, padding: 000, cadastral_section: 2 characters)
      const paddedCodeInsee = citycode.padStart(5, '0');
      const padding = '000';
      const normalizedCadastral = cadastralSection.toUpperCase().padEnd(2, '0').substring(0, 2);
      const locationCode = `${paddedCodeInsee}${padding}${normalizedCadastral}`;

      const result: GeocodingResult = {
        address: suggestion.label,
        postalCode: parseInt(postcode) || 0,
        citycode,
        coordinates: { lon, lat },
        locationCode,
        department,
        municipality,
        cadastralSection,
      };

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process address';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
  }, [getParcelData]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    loading,
    error,
    searchAddresses,
    selectAddress,
    clearSuggestions,
  };
}

