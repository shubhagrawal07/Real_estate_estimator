'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { favouritePropertyService } from '@/services/favourite-property.service';

export interface EstimateItem {
  propertyId: string;
  address: string;
  status?: string;
  createdDate?: string;
  type?: string;
  area?: number;
  bedrooms?: number;
  estimatedPrice?: number;
  [key: string]: unknown;
}

export function useMyEstimates() {
  const { data: session } = useSession();
  const token = session?.backendToken;
  const [estimates, setEstimates] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await propertyEstimateService.getMyEstimates(token);
      setEstimates(data as EstimateItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    estimates,
    setEstimates,
    loading,
    error,
    refetch,
    token,
  };
}

export function useFavourites() {
  const { data: session } = useSession();
  const token = session?.backendToken;
  const [favourites, setFavourites] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavourites = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await favouritePropertyService.getUserFavourites(token);
      setFavourites(data as EstimateItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favourites');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    favourites,
    loading,
    error,
    refetch: fetchFavourites,
    setFavourites,
    token,
  };
}
