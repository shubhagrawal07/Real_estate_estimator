'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import PropertyEstimateForm from '@/components/PropertyEstimateForm';
import EstimateResult from '@/components/EstimateResult';
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
      
      // Set estimate to display on same page
      setEstimate(data);
    } catch (err) {
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
          Fill out the form below to get an instant estimate of your property's current market value
        </p>
      </div>

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
