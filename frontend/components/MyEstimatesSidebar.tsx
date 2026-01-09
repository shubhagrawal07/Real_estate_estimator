'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './MyEstimatesSidebar.module.css';

interface PropertyEstimate {
  propertyId: string;
  address: string;
  estimatedPrice?: number;
  createdDate: string;
  status: string;
  type: string;
  area: number;
}

interface MyEstimatesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onEstimateSelect?: (estimate: PropertyEstimate) => void;
}

export default function MyEstimatesSidebar({ isOpen, onClose, onEstimateSelect }: MyEstimatesSidebarProps) {
  const { data: session } = useSession();
  const [estimates, setEstimates] = useState<PropertyEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && session && (session as any).backendToken) {
      fetchEstimates();
    }
  }, [isOpen, session]);

  const fetchEstimates = async () => {
    setLoading(true);
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

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2>My Estimates</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading estimates...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : estimates.length === 0 ? (
            <div className={styles.empty}>No estimates found</div>
          ) : (
            <div className={styles.estimatesList}>
              {estimates.map((estimate) => (
                <div 
                  key={estimate.propertyId} 
                  className={styles.estimateItem}
                  onClick={() => {
                    if (onEstimateSelect) {
                      onEstimateSelect(estimate);
                    }
                  }}
                  style={{ cursor: onEstimateSelect ? 'pointer' : 'default' }}
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
                  </div>
                  <div className={styles.estimatePrice}>{formatPrice(estimate.estimatedPrice)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

