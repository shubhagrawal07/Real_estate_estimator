'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import PropertyEstimateForm, { type PropertyData } from '@/components/PropertyEstimateForm';
import EstimateResult from '@/components/EstimateResult';
import LoadingScreen from '@/components/LoadingScreen';
import { propertyEstimateService } from '@/services/property-estimate.service';
import type { PropertyEstimateResponse } from '@/types/estimate';
import styles from './page.module.css';

export default function GetEstimatesPage() {
  const { data: session } = useSession();
  const [estimate, setEstimate] = useState<PropertyEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async (propertyData: PropertyData) => {
    setLoading(true);
    setError(null);
    setEstimate(null);

    const startTime = Date.now();
    const MIN_LOADING_TIME = 5000;

    try {
      const token = session?.backendToken ?? null;
      const data = await propertyEstimateService.create(propertyData, token);

      localStorage.setItem('latestEstimate', JSON.stringify(data));
      if (!session) {
        const draftEstimates = JSON.parse(localStorage.getItem('draftEstimates') || '[]');
        draftEstimates.push(data.propertyId);
        localStorage.setItem('draftEstimates', JSON.stringify(draftEstimates));
      }
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }
      setEstimate(data);
    } catch (err) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please make sure the backend is running on http://localhost:3001');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred while getting the estimate');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Get Property Estimate</h1>
        <p className={styles.subtitle}>
          Fill out the form below to get an instant estimate of your property&apos;s current market value
        </p>
      </div>

      {loading && <LoadingScreen />}

      <div className={styles.content}>
        {!estimate ? (
          <>
            <div className={styles.formSection}>
              <PropertyEstimateForm onSubmit={handleEstimate} loading={loading} />
            </div>
            
            {error && (
              <div className={styles.error}>
                <p>Error: {error}</p>
              </div>
            )}
          </>
        ) : (
          <div className={styles.resultSection}>
            <div className={styles.resultHeader}>
              <button 
                className={styles.newEstimateButton}
                onClick={() => {
                  setEstimate(null);
                  setError(null);
                }}
              >
                Create New Estimate
              </button>
            </div>
            <EstimateResult estimate={estimate} />
          </div>
        )}
      </div>
    </div>
  );
}
