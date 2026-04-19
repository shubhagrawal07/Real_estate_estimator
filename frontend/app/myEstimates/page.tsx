'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import EstimateDisplay from '@/components/EstimateDisplay';
import PotentialBuyersModal from '@/components/PotentialBuyersModal';
import { HoverTooltip } from '@/components/HoverTooltip';
import { useMyEstimates, useFavourites, type EstimateItem } from '@/hooks/useMyEstimates';
import { getPriceRangeIn5000 } from '@/lib/price-range';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { favouritePropertyService } from '@/services/favourite-property.service';
import { buyerSearchService } from '@/services/buyer-search.service';
import { buyerIntentService } from '@/services/buyer-intent.service';
import { BuyerPropertyIntentModal } from '@/components/buyer-intent/BuyerPropertyIntentModal';
import type { BuyerIntentModalProperty } from '@/components/buyer-intent/BuyerPropertyIntentModal';
import { getCityLabelForInsee } from '@/constants/varCitiesNearToulon';
import { zoneFieldsFromLocationCode } from '@/lib/location-code';
import { hasConcreteCadastralSection, normalizeRanked } from '@/lib/buyer-intent-zoning';
import type { BuyerIntentFlags } from '@/types/buyer-intent';
import styles from './page.module.css';

interface PropertyEstimate {
  propertyId: string;
  address: string;
  locationCode: string;
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

function toBuyerIntentModalProperty(estimate: EstimateItem): BuyerIntentModalProperty {
  const rec = estimate as Record<string, unknown>;
  const lc = typeof rec.locationCode === 'string' ? rec.locationCode : '';
  const z = zoneFieldsFromLocationCode(lc);
  return {
    propertyId: estimate.propertyId,
    address: estimate.address,
    budget:
      typeof estimate.estimatedPrice === 'number' && estimate.estimatedPrice > 0
        ? Math.round(estimate.estimatedPrice)
        : undefined,
    cityInseeCode: z.cityInseeCode,
    cadastralSection: z.cadastralSection,
    locationCode: lc,
  };
}

export default function MyEstimatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('estimates');
  const {
    estimates,
    setEstimates,
    loading: fetching,
    error: errorEstimates,
    refetch: fetchEstimates,
    token,
  } = useMyEstimates();
  const {
    favourites,
    setFavourites,
    loading: fetchingFavourites,
    error: errorFavourites,
    refetch: fetchFavourites,
  } = useFavourites();
  const [selectedEstimate, setSelectedEstimate] = useState<PropertyEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; propertyId: string | null }>({
    show: false,
    propertyId: null,
  });
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [intentModalProperty, setIntentModalProperty] = useState<BuyerIntentModalProperty | null>(null);
  const [intentFlags, setIntentFlags] = useState<Record<string, BuyerIntentFlags>>({});
  const intentContextEstimateRef = useRef<EstimateItem | null>(null);
  const [potentialBuyersPropertyId, setPotentialBuyersPropertyId] = useState<string | null>(null);
  const error = activeTab === 'estimates' ? errorEstimates : errorFavourites;

  useEffect(() => {
    if (token) {
      if (activeTab === 'estimates') fetchEstimates();
      else fetchFavourites();
    }
  }, [token, activeTab, fetchEstimates, fetchFavourites]);

  useEffect(() => {
    if (activeTab === 'favourites') setSelectedEstimate(null);
  }, [activeTab]);

  useEffect(() => {
    if (!token || activeTab === 'estimates') {
      setIntentFlags({});
      return;
    }
    const list = favourites;
    if (list.length === 0) {
      setIntentFlags({});
      return;
    }
    const ids = list.map((e) => e.propertyId);
    void buyerIntentService
      .batchFlags(ids, token)
      .then(setIntentFlags)
      .catch(() => {});
  }, [token, activeTab, favourites]);

  const fetchEstimate = async (estimateId: string) => {
    setLoading(true);
    try {
      const data = await propertyEstimateService.getById(estimateId);
      setSelectedEstimate(data as unknown as PropertyEstimate);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleEstimateClick = (estimate: EstimateItem | PropertyEstimate) => {
    if (activeTab === 'favourites') return;
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
      const data = await propertyEstimateService.recalculate(selectedEstimate.propertyId);
      const updated = { ...data } as unknown as PropertyEstimate;
      setSelectedEstimate(updated);
      setEstimates(
        estimates.map((e) =>
          e.propertyId === data.propertyId ? updated : e
        ) as EstimateItem[]
      );
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, propertyId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.propertyId || !token) return;
    try {
      await propertyEstimateService.delete(deleteConfirm.propertyId, token);

      setEstimates(estimates.filter((e) => e.propertyId !== deleteConfirm.propertyId));

      if (selectedEstimate?.propertyId === deleteConfirm.propertyId) {
        setSelectedEstimate(null);
      }

      setDeleteConfirm({ show: false, propertyId: null });
    } catch {
      alert('Failed to delete estimate. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, propertyId: null });
  };

  const handleMyEstimatesAreaNavigate = async (_prop: BuyerIntentModalProperty) => {
    const est = intentContextEstimateRef.current;
    if (!token || !est) return;
    const rec = est as Record<string, unknown>;
    const lc = typeof rec.locationCode === 'string' ? rec.locationCode : '';
    const z = zoneFieldsFromLocationCode(lc);
    const cityInseeCode = z.cityInseeCode;
    if (!cityInseeCode) {
      window.alert('Unable to determine area for this property.');
      return;
    }
    const cadastralSection = hasConcreteCadastralSection(z.cadastralSection)
      ? z.cadastralSection
      : undefined;
    const propertyType = est.type === 'House' ? 'House' : 'Apartment';
    const budget = Math.max(
      1,
      typeof est.estimatedPrice === 'number' && est.estimatedPrice > 0
        ? Math.round(est.estimatedPrice)
        : 400000
    );
    const bedrooms = typeof est.bedrooms === 'number' ? est.bedrooms : 0;
    const minSurfaceArea =
      typeof est.area === 'number' ? Math.max(0, Math.floor(est.area * 0.7)) : 0;
    try {
      const data = await buyerSearchService.search(
        {
          propertyType,
          cityInseeCode,
          cadastralSection,
          budget,
          bedrooms,
          minSurfaceArea,
          pool: false,
        },
        token
      );
      const normalized = data.properties.map((p) => normalizeRanked(p));
      sessionStorage.setItem('buyerSearchResults', JSON.stringify(normalized));
      const cityLabel = getCityLabelForInsee(cityInseeCode);
      sessionStorage.setItem(
        'buyerSearchCriteria',
        JSON.stringify({
          propertyType,
          cityInseeCode,
          cityLabel: cityLabel ?? cityInseeCode,
          cadastralSection: cadastralSection ?? '',
          budget,
          bedrooms,
          minSurfaceArea,
          pool: false,
        })
      );
      router.push('/buyerSearchResults');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Search failed');
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
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const isBuyerTrackingEnabled = (estimate: EstimateItem) => estimate.buyerTracking !== false;

  if (!token) {
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
          type="button"
          className={`${styles.tab} ${activeTab === 'estimates' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('estimates')}
        >
          My Estimates
        </button>
        <button
          type="button"
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
              <button type="button" className={styles.createButton} onClick={() => router.push('/getEstimates')}>
                Get Estimate
              </button>
            ) : (
              <button type="button" className={styles.createButton} onClick={() => router.push('/buyerSearch')}>
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
                    activeTab === 'estimates' && selectedEstimate?.propertyId === estimate.propertyId
                      ? styles.expanded
                      : ''
                  } ${activeTab === 'favourites' ? styles.notExpandable : ''}`}
                  onClick={() => handleEstimateClick(estimate)}
                >
                  <div className={styles.estimateSummary}>
                    <div className={styles.estimateHeader}>
                      <span className={styles.status}>{estimate.status}</span>
                      <span className={styles.date}>{formatDate(estimate.createdDate ?? '')}</span>
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
                    {activeTab === 'favourites' &&
                      (intentFlags[estimate.propertyId]?.highInterest ||
                        intentFlags[estimate.propertyId]?.alertActive) && (
                        <div className={styles.intentBadgeRow}>
                          {intentFlags[estimate.propertyId]?.highInterest && (
                            <span className={styles.intentBadge}>● You&apos;re interested</span>
                          )}
                          {intentFlags[estimate.propertyId]?.alertActive && (
                            <span className={styles.intentBadge}>🔔 Alert active</span>
                          )}
                        </div>
                      )}
                  </div>
                  <div className={styles.estimateActions}>
                    <HoverTooltip label="View on map" block>
                      <button
                        type="button"
                        className={styles.viewMapButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          const source = activeTab === 'favourites' ? 'favourites' : 'estimates';
                          router.push(`/myPropertiesMap?propertyId=${estimate.propertyId}&source=${source}`);
                        }}
                        aria-label="View on map"
                      >
                        🗺️ View on Map
                      </button>
                    </HoverTooltip>
                    {activeTab === 'estimates' && isBuyerTrackingEnabled(estimate) && (
                      <HoverTooltip label="Buyers who expressed intent on this listing (anonymous)" block>
                        <button
                          type="button"
                          className={styles.potentialBuyersButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPotentialBuyersPropertyId(estimate.propertyId);
                          }}
                          aria-label="Potential buyers"
                        >
                          Potential buyers
                        </button>
                      </HoverTooltip>
                    )}
                    <div className={styles.estimateIconActions}>
                      {activeTab === 'favourites' && (
                        <HoverTooltip label="Your interest in this property">
                          <button
                            type="button"
                            className={styles.intentMenuButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              intentContextEstimateRef.current = estimate;
                              setIntentModalProperty(toBuyerIntentModalProperty(estimate));
                              setIntentModalOpen(true);
                            }}
                            aria-label="Property actions"
                          >
                            ⋯
                          </button>
                        </HoverTooltip>
                      )}
                      {activeTab === 'estimates' && (
                        <HoverTooltip label="Delete this estimate">
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={(e) => handleDeleteClick(e, estimate.propertyId)}
                            aria-label="Delete this estimate"
                          >
                            🗑️
                          </button>
                        </HoverTooltip>
                      )}
                      {activeTab === 'favourites' && token && (
                        <HoverTooltip label="Remove from favourites">
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await favouritePropertyService.remove(estimate.propertyId, token);
                                setFavourites(favourites.filter((f) => f.propertyId !== estimate.propertyId));
                                if (selectedEstimate?.propertyId === estimate.propertyId) {
                                  setSelectedEstimate(null);
                                }
                              } catch {
                                // Silent fail
                              }
                            }}
                            aria-label="Remove from favourites"
                          >
                            ❤️
                          </button>
                        </HoverTooltip>
                      )}
                      {activeTab === 'estimates' && (
                        <HoverTooltip label="See property details">
                          <button
                            type="button"
                            className={styles.detailsButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEstimateClick(estimate);
                            }}
                            aria-expanded={selectedEstimate?.propertyId === estimate.propertyId}
                            aria-label={
                              selectedEstimate?.propertyId === estimate.propertyId
                                ? 'Hide property details'
                                : 'Show property details'
                            }
                          >
                            Details
                          </button>
                        </HoverTooltip>
                      )}
                    </div>
                  </div>
                </div>

                {activeTab === 'estimates' && selectedEstimate?.propertyId === estimate.propertyId && (
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

      <BuyerPropertyIntentModal
        open={intentModalOpen}
        onClose={() => {
          setIntentModalOpen(false);
          setIntentModalProperty(null);
          intentContextEstimateRef.current = null;
        }}
        property={intentModalProperty}
        token={token}
        onSaved={async () => {
          if (activeTab !== 'favourites') return;
          const ids = favourites.map((e) => e.propertyId);
          if (!token || ids.length === 0) return;
          try {
            const m = await buyerIntentService.batchFlags(ids, token);
            setIntentFlags(m);
          } catch {
            // ignore
          }
        }}
        onAreaInterest={handleMyEstimatesAreaNavigate}
      />

      <PotentialBuyersModal
        open={potentialBuyersPropertyId !== null}
        onClose={() => setPotentialBuyersPropertyId(null)}
        propertyId={potentialBuyersPropertyId ?? ''}
        token={token}
      />

      {deleteConfirm.show && (
        <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirm Delete</h3>
            <p className={styles.modalMessage}>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </p>
            <div className={styles.modalButtons}>
              <button type="button" className={styles.cancelButton} onClick={handleDeleteCancel}>
                No
              </button>
              <button type="button" className={styles.confirmButton} onClick={handleDeleteConfirm}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
