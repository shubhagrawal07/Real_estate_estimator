'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import PropertyEstimateForm from '@/components/PropertyEstimateForm';
import EstimateResult from '@/components/EstimateResult';
import LoadingScreen from '@/components/LoadingScreen';
import styles from './page.module.css';

export default function GetEstimatesPage() {
  const { data: session } = useSession();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async (propertyData: any) => {
    setLoading(true);
    setError(null);
    setEstimate(null);

    const startTime = Date.now();
    const MIN_LOADING_TIME = 5000; // 5 seconds minimum loading time

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth token if user is logged in
      if (session && (session as any).backendToken) {
        headers['Authorization'] = `Bearer ${(session as any).backendToken}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(propertyData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Store estimate in localStorage
      localStorage.setItem('latestEstimate', JSON.stringify(data));
      
      // If user is not logged in, store the property ID as draft
      if (!session) {
        const draftEstimates = JSON.parse(localStorage.getItem('draftEstimates') || '[]');
        draftEstimates.push(data.propertyId);
        localStorage.setItem('draftEstimates', JSON.stringify(draftEstimates));
      }
      
      // Ensure loading screen is visible for at least 5 seconds
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Set estimate to display on same page
      setEstimate(data);
    } catch (err) {
      // Ensure loading screen is visible for at least 5 seconds even on error
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
