'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EstimateDisplay from '@/components/EstimateDisplay';
import Modal from '@/components/Modal';
import PotentialBuyersModal from '@/components/PotentialBuyersModal';
import { getPriceRangeIn5000 } from '@/lib/price-range';
import { useMyEstimates, useFavourites, type EstimateItem } from '@/hooks/useMyEstimates';
import { useSellerChatbot } from '@/hooks/useSellerChatbot';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { favouritePropertyService } from '@/services/favourite-property.service';
import type { EstimateFeedback, PropertyEstimateResponse } from '@/types/estimate';
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
  engagementLevel?: number;
  buyerTracking?: boolean;
}

function SellerPriceEntryForm({
  onSubmit,
  onSkip,
}: {
  onSubmit: (price: number) => void;
  onSkip: () => void;
}) {
  const [value, setValue] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(value.replace(/\s/g, '').replace(/,/g, ''));
    if (Number.isFinite(num) && num > 0) {
      onSubmit(num);
    }
  };
  return (
    <form onSubmit={handleSubmit} className={styles.priceEntryForm}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="e.g. 250000"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={styles.priceEntryInput}
      />
      <div className={styles.chatbotOptions}>
        <button type="submit" className={styles.chatbotPrimaryButton}>
          Submit
        </button>
        <button type="button" className={styles.chatbotOptionButton} onClick={onSkip}>
          Skip
        </button>
      </div>
    </form>
  );
}

type TabType = 'estimates' | 'favourites';

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
  const [potentialBuyersPropertyId, setPotentialBuyersPropertyId] = useState<string | null>(null);
  const [hasHighBuyerInterest, setHasHighBuyerInterest] = useState(false);

  const error = activeTab === 'estimates' ? errorEstimates : errorFavourites;

  useEffect(() => {
    if (!selectedEstimate?.propertyId || !token) {
      setHasHighBuyerInterest(false);
      return;
    }
    propertyEstimateService
      .getBuyerInterest(selectedEstimate.propertyId, token)
      .then((res) => setHasHighBuyerInterest(res.hasHighBuyerInterest))
      .catch(() => setHasHighBuyerInterest(false));
  }, [selectedEstimate?.propertyId, token]);

  const sellerChatbot = useSellerChatbot({
    propertyId: selectedEstimate?.propertyId ?? '',
    estimate: (selectedEstimate ?? null) as PropertyEstimateResponse | null,
    hasHighBuyerInterest,
    token,
    onlyShowIfEngagementLevelAbove: 10,
    onEngagementUpdated: (updated) => {
      setSelectedEstimate((prev) =>
        prev && prev.propertyId === updated.propertyId
          ? { ...prev, engagementLevel: updated.engagementLevel }
          : prev
      );
    },
  });

  useEffect(() => {
    if (token) {
      if (activeTab === 'estimates') fetchEstimates();
      else fetchFavourites();
    }
  }, [token, activeTab, fetchEstimates, fetchFavourites]);

  // Collapse expanded card when switching to favourites tab
  useEffect(() => {
    if (activeTab === 'favourites') setSelectedEstimate(null);
  }, [activeTab]);

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
    // Favourites tab: cards are not expandable
    if (activeTab === 'favourites') return;
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
    e.stopPropagation(); // Prevent expand/collapse behavior
    setDeleteConfirm({ show: true, propertyId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.propertyId || !token) return;
    try {
      await propertyEstimateService.delete(deleteConfirm.propertyId, token);

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

  const priceEntryTitle =
    selectedEstimate?.estimatedPrice != null
      ? (() => {
          const { min, max } = getPriceRangeIn5000(selectedEstimate.estimatedPrice);
          return `The estimated market value is between ${formatPrice(min)} and ${formatPrice(max)}. At what price would you seriously consider selling?`;
        })()
      : 'At what price would you seriously consider selling?';

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
                    activeTab === 'estimates' &&
                    selectedEstimate?.propertyId === estimate.propertyId
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
                    {activeTab === 'estimates' && Boolean((estimate as { buyerTracking?: boolean }).buyerTracking) && (
                      <button
                        className={styles.viewMapButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPotentialBuyersPropertyId(estimate.propertyId);
                        }}
                        title="View potential buyers"
                      >
                        Potential Buyers
                      </button>
                    )}
                    {activeTab === 'estimates' && (
                      <button
                        className={styles.deleteButton}
                        onClick={(e) => handleDeleteClick(e, estimate.propertyId)}
                        title="Delete estimate"
                      >
                        🗑️
                      </button>
                    )}
                    {activeTab === 'favourites' && token && (
                      <button
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
                        title="Remove from favourites"
                      >
                        ❤️
                      </button>
                    )}
                    {activeTab === 'estimates' && (
                      <div className={styles.expandIcon}>
                        {selectedEstimate?.propertyId === estimate.propertyId ? '▼' : '▶'}
                      </div>
                    )}
                  </div>
                </div>

                {activeTab === 'estimates' &&
                  selectedEstimate?.propertyId === estimate.propertyId && (
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

      {/* Seller chatbot modals (when recalculate returns engagementLevel > 10) */}
      <Modal
        open={sellerChatbot.showFeedback}
        onClose={sellerChatbot.closeModal}
        title="How does this estimation feel?"
        dismissLabel="Close"
      >
        <div className={styles.chatbotOptions}>
          {(
            [
              { value: 'accurate' as EstimateFeedback, label: 'Accurate' },
              { value: 'high' as EstimateFeedback, label: 'A bit high' },
              { value: 'low' as EstimateFeedback, label: 'A bit low' },
              { value: 'inaccurate' as EstimateFeedback, label: 'Not accurate' },
            ]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={styles.chatbotOptionButton}
              onClick={() => sellerChatbot.onFeedbackSelect(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={sellerChatbot.showTrackDemand}
        onClose={sellerChatbot.closeModal}
        title="Track buyer demand in your area without publicly listing your property?"
        dismissLabel="Close"
      >
        <div className={styles.chatbotOptions}>
          <button
            type="button"
            className={styles.chatbotPrimaryButton}
            onClick={() => sellerChatbot.onTrackDemandSelect(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={styles.chatbotOptionButton}
            onClick={() => sellerChatbot.onTrackDemandSelect(false)}
          >
            No
          </button>
        </div>
      </Modal>
      <Modal
        open={sellerChatbot.showPriceEntry}
        onClose={sellerChatbot.closeModal}
        title={priceEntryTitle}
        dismissLabel="Close"
      >
        <SellerPriceEntryForm
          onSubmit={sellerChatbot.onPriceSubmit}
          onSkip={sellerChatbot.onPriceSkip}
        />
      </Modal>
      <Modal
        open={sellerChatbot.showThanks}
        onClose={sellerChatbot.closeThanks}
        title="Thanks for your feedback"
        dismissLabel="Close"
      >
        <p className={styles.chatbotMessage}>Your interest has been recorded.</p>
        <p className={styles.chatbotMessage}>
          We will notify you if this property evolves or if a similar opportunity appears.
        </p>
      </Modal>
      <Modal
        open={sellerChatbot.showScheduleCall}
        onClose={() => sellerChatbot.onScheduleCallSelect(false)}
        title="A local specialist can help you decide"
        dismissLabel="Close"
      >
        <div className={styles.chatbotOptions}>
          <button
            type="button"
            className={styles.chatbotPrimaryButton}
            onClick={() => sellerChatbot.onScheduleCallSelect(true)}
          >
            Schedule a call with the agent
          </button>
          <button
            type="button"
            className={styles.chatbotOptionButton}
            onClick={() => sellerChatbot.onScheduleCallSelect(false)}
          >
            Not yet
          </button>
        </div>
      </Modal>
      <Modal
        open={sellerChatbot.showScheduleCallConfirmed}
        onClose={sellerChatbot.closeScheduleCallConfirmed}
        title="Agent will contact you soon…"
        dismissLabel="Close"
      >
        <p className={styles.chatbotMessage}>
          An agent will reach out to you shortly to help with your property.
        </p>
        <button
          type="button"
          className={styles.chatbotPrimaryButton}
          onClick={sellerChatbot.closeScheduleCallConfirmed}
        >
          OK
        </button>
      </Modal>
      <PotentialBuyersModal
        open={potentialBuyersPropertyId !== null}
        onClose={() => setPotentialBuyersPropertyId(null)}
        propertyId={potentialBuyersPropertyId ?? ''}
        token={token ?? undefined}
      />
    </div>
  );
}
