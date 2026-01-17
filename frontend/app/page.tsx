'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PropertyEstimateForm from '@/components/PropertyEstimateForm';
import styles from './page.module.css';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleEstimate = async (propertyData: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/property-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      sessionStorage.setItem('latestEstimate', JSON.stringify(data));
      router.push('/estimate');
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
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Real Estate Price Estimator</h1>
          <p className={styles.subtitle}>
            Get an instant estimate of your property's current market value
          </p>
        </div>

        <div className={styles.content}>
          <PropertyEstimateForm onSubmit={handleEstimate} loading={loading} />
          
          {error && (
            <div className={styles.error}>
              <p>Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
