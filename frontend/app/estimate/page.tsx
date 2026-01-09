'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EstimateDisplay from '@/components/EstimateDisplay';
import styles from './page.module.css';

export default function EstimatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const estimateId = searchParams.get('id');
    if (estimateId) {
      fetchEstimate(estimateId);
    } else {
      const savedEstimate = localStorage.getItem('latestEstimate');
      if (savedEstimate) {
        try {
          const estimate = JSON.parse(savedEstimate);
          setCurrentEstimate(estimate);
          localStorage.removeItem('latestEstimate');
        } catch (err) {
          console.error('Failed to parse saved estimate:', err);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchEstimate = async (estimateId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${estimateId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentEstimate(data);
      } else {
        console.error('Failed to fetch estimate');
      }
    } catch (error) {
      console.error('Error fetching estimate:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleRecalculate = async () => {
    if (!currentEstimate) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${currentEstimate.propertyId}/recalculate`,
        {
          method: 'PUT',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to recalculate estimate');
      }

      const data = await response.json();
      setCurrentEstimate(data);
    } catch (error) {
      console.error('Error recalculating estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loading}>Loading estimate...</div>
      ) : currentEstimate ? (
        <EstimateDisplay 
          estimate={currentEstimate} 
          onRecalculate={handleRecalculate}
          loading={loading}
        />
      ) : (
        <div className={styles.noEstimate}>
          <p>No estimate available. Please go back to create an estimate.</p>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/getEstimates')}
          >
            Create New Estimate
          </button>
        </div>
      )}
    </div>
  );
}

