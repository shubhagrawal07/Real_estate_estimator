'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EstimateDisplay from '@/components/EstimateDisplay';
import { getPriceRangeIn5000 } from '@/lib/price-range';
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
  basePricePerSqM?: number;
  status: string;
  createdDate: string;
}

type TabType = 'estimates' | 'favourites';

export default function MyEstimatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('estimates');
  const [estimates, setEstimates] = useState<PropertyEstimate[]>([]);
  const [favourites, setFavourites] = useState<PropertyEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<PropertyEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchingFavourites, setFetchingFavourites] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; propertyId: string | null }>({
    show: false,
    propertyId: null,
  });

  useEffect(() => {
    if (session && (session as any).backendToken) {
      if (activeTab === 'estimates') {
        fetchEstimates();
      } else if (activeTab === 'favourites') {
        fetchFavourites();
      }
    } else {
      setFetching(false);
    }
  }, [session, activeTab]);

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

  const fetchFavourites = async () => {
    setFetchingFavourites(true);
    setError(null);
    try {
      const token = (session as any).backendToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/favourite-property/user/favourites`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch favourites');
      }

      const data = await response.json();
      setFavourites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favourites');
    } finally {
      setFetchingFavourites(false);
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
    // If clicking the same estimate, collapse it
    if (selectedEstimate?.propertyId === estimate.propertyId) {
      setSelectedEstimate(null);
    } else {
      fetchEstimate(estimate.propertyId);
    }
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

  const handleDeleteClick = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation(); // Prevent expand/collapse behavior
    setDeleteConfirm({ show: true, propertyId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.propertyId) return;

    try {
      const token = (session as any).backendToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${deleteConfirm.propertyId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete estimate');
      }

      // Remove from list
      setEstimates(estimates.filter(e => e.propertyId !== deleteConfirm.propertyId));
      
      // Close selected estimate if it was deleted
      if (selectedEstimate?.propertyId === deleteConfirm.propertyId) {
        setSelectedEstimate(null);
      }
      
      setDeleteConfirm({ show: false, propertyId: null });
    } catch (error) {
      console.error('Error deleting estimate:', error);
      alert('Failed to delete estimate. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, propertyId: null });
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

  const currentList = activeTab === 'estimates' ? estimates : favourites;
  const isLoading = activeTab === 'estimates' ? fetching : fetchingFavourites;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Properties</h1>
        <p className={styles.subtitle}>View and manage all your properties</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'estimates' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('estimates')}
        >
          My Estimates
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'favourites' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('favourites')}
        >
          Favourites
        </button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            Loading {activeTab === 'estimates' ? 'estimates' : 'favourites'}...
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : currentList.length === 0 ? (
          <div className={styles.empty}>
            <p>
              {activeTab === 'estimates'
                ? 'No estimates found. Create your first estimate!'
                : 'No favourites found. Search for properties and add them to your favourites!'}
            </p>
            {activeTab === 'estimates' ? (
              <button 
                className={styles.createButton}
                onClick={() => router.push('/getEstimates')}
              >
                Get Estimate
              </button>
            ) : (
              <button 
                className={styles.createButton}
                onClick={() => router.push('/buyerSearch')}
              >
                Search Properties
              </button>
            )}
          </div>
        ) : (
          <div className={styles.estimatesList}>
            {currentList.map((estimate) => (
              <div key={estimate.propertyId} className={styles.estimateContainer}>
                <div
                  className={`${styles.estimateItem} ${
                    selectedEstimate?.propertyId === estimate.propertyId ? styles.expanded : ''
                  }`}
                  onClick={() => handleEstimateClick(estimate)}
                >
                  <div className={styles.estimateSummary}>
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
                    <div className={styles.estimatePrice}>
                      {estimate.estimatedPrice
                        ? (() => {
                            const { min, max } = getPriceRangeIn5000(estimate.estimatedPrice);
                            return `${formatPrice(min)} – ${formatPrice(max)}`;
                          })()
                        : 'N/A'}
                    </div>
                  </div>
                  <div className={styles.estimateActions}>
                    <button
                      className={styles.viewMapButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        const source = activeTab === 'favourites' ? 'favourites' : 'estimates';
                        router.push(`/myPropertiesMap?propertyId=${estimate.propertyId}&source=${source}`);
                      }}
                      title="View on map"
                    >
                      🗺️ View on Map
                    </button>
                    {activeTab === 'estimates' && (
                      <button
                        className={styles.deleteButton}
                        onClick={(e) => handleDeleteClick(e, estimate.propertyId)}
                        title="Delete estimate"
                      >
                        🗑️
                      </button>
                    )}
                    {activeTab === 'favourites' && (
                      <button
                        className={styles.deleteButton}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const token = (session as any).backendToken;
                            const response = await fetch(
                              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/favourite-property/${estimate.propertyId}`,
                              {
                                method: 'DELETE',
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            if (response.ok) {
                              setFavourites(favourites.filter(f => f.propertyId !== estimate.propertyId));
                              if (selectedEstimate?.propertyId === estimate.propertyId) {
                                setSelectedEstimate(null);
                              }
                            }
                          } catch (err) {
                            console.error('Error removing favourite:', err);
                          }
                        }}
                        title="Remove from favourites"
                      >
                        ❤️
                      </button>
                    )}
                    <div className={styles.expandIcon}>
                      {selectedEstimate?.propertyId === estimate.propertyId ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {selectedEstimate?.propertyId === estimate.propertyId && (
                  <div className={styles.estimateDetailExpanded}>
                    {loading ? (
                      <div className={styles.loading}>Loading details...</div>
                    ) : (
                      <EstimateDisplay
                        estimate={selectedEstimate}
                        onRecalculate={handleRecalculate}
                        loading={loading}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirm Delete</h3>
            <p className={styles.modalMessage}>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={handleDeleteCancel}>
                No
              </button>
              <button className={styles.confirmButton} onClick={handleDeleteConfirm}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
