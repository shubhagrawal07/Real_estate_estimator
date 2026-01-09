'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EstimateDisplay from '@/components/EstimateDisplay';
import styles from './page.module.css';

interface PropertyEstimate {
  propertyId: string;
  address: string;
  postalCode: number;
  department: string;
  municipality: string;
  cadastralSection: string;
  type: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
  ownershipType: string;
  deadline: string;
  condition?: string;
  estimatedPrice?: number;
  status: string;
  createdDate: string;
}

export default function MyEstimatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [estimates, setEstimates] = useState<PropertyEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<PropertyEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && (session as any).backendToken) {
      fetchEstimates();
    } else {
      setFetching(false);
    }
  }, [session]);

  const fetchEstimates = async () => {
    setFetching(true);
    setError(null);
    try {
      const token = (session as any).backendToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/user/my-estimates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch estimates');
      }

      const data = await response.json();
      setEstimates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load estimates');
    } finally {
      setFetching(false);
    }
  };

  const fetchEstimate = async (estimateId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${estimateId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedEstimate(data);
      } else {
        console.error('Failed to fetch estimate');
      }
    } catch (error) {
      console.error('Error fetching estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEstimateClick = (estimate: PropertyEstimate) => {
    fetchEstimate(estimate.propertyId);
  };

  const handleRecalculate = async () => {
    if (!selectedEstimate) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${selectedEstimate.propertyId}/recalculate`,
        {
          method: 'PUT',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to recalculate estimate');
      }

      const data = await response.json();
      setSelectedEstimate(data);
      // Update in list
      setEstimates(estimates.map(e => 
        e.propertyId === data.propertyId ? data : e
      ));
    } catch (error) {
      console.error('Error recalculating estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.notLoggedIn}>
          <p>Please log in to view your estimates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Estimates</h1>
        <p className={styles.subtitle}>View and manage all your property estimates</p>
      </div>

      <div className={styles.content}>
        <div className={styles.listSection}>
          <h2 className={styles.sectionTitle}>Your Estimates</h2>
          {fetching ? (
            <div className={styles.loading}>Loading estimates...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : estimates.length === 0 ? (
            <div className={styles.empty}>
              <p>No estimates found. Create your first estimate!</p>
              <button 
                className={styles.createButton}
                onClick={() => router.push('/getEstimates')}
              >
                Get Estimate
              </button>
            </div>
          ) : (
            <div className={styles.estimatesList}>
              {estimates.map((estimate) => (
                <div
                  key={estimate.propertyId}
                  className={`${styles.estimateItem} ${
                    selectedEstimate?.propertyId === estimate.propertyId ? styles.selected : ''
                  }`}
                  onClick={() => handleEstimateClick(estimate)}
                >
                  <div className={styles.estimateHeader}>
                    <span className={styles.status}>{estimate.status}</span>
                    <span className={styles.date}>{formatDate(estimate.createdDate)}</span>
                  </div>
                  <div className={styles.estimateAddress}>{estimate.address}</div>
                  <div className={styles.estimateDetails}>
                    <span>{estimate.type}</span>
                    <span>•</span>
                    <span>{estimate.area} m²</span>
                    <span>•</span>
                    <span>{estimate.bedrooms} bed</span>
                  </div>
                  <div className={styles.estimatePrice}>{formatPrice(estimate.estimatedPrice)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.detailSection}>
          {loading && !selectedEstimate ? (
            <div className={styles.loading}>Loading estimate...</div>
          ) : selectedEstimate ? (
            <EstimateDisplay
              estimate={selectedEstimate}
              onRecalculate={handleRecalculate}
              loading={loading}
            />
          ) : (
            <div className={styles.noSelection}>
              <p>Select an estimate from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
