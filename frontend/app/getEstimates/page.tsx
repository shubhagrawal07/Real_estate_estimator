'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PropertyEstimateForm, { type PropertyData } from '@/components/PropertyEstimateForm';
import EstimateResult from '@/components/EstimateResult';
import LoadingScreen from '@/components/LoadingScreen';
import Modal from '@/components/Modal';
import PotentialBuyersModal from '@/components/PotentialBuyersModal';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { useSellerChatbot } from '@/hooks/useSellerChatbot';
import type { PropertyEstimateResponse, EstimateFeedback } from '@/types/estimate';
import styles from './page.module.css';

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

export default function GetEstimatesPage() {
  const { data: session } = useSession();
  const [estimate, setEstimate] = useState<PropertyEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHighBuyerInterest, setHasHighBuyerInterest] = useState(false);
  const [showPotentialBuyers, setShowPotentialBuyers] = useState(false);

  const token = session?.backendToken;

  useEffect(() => {
    if (!estimate?.propertyId || !token) return;
    const fetchBuyerInterest = () => {
      propertyEstimateService
        .getBuyerInterest(estimate.propertyId, token)
        .then((res) => setHasHighBuyerInterest(res.hasHighBuyerInterest))
        .catch(() => setHasHighBuyerInterest(false));
    };
    fetchBuyerInterest();
    const interval = setInterval(fetchBuyerInterest, 20_000);
    return () => clearInterval(interval);
  }, [estimate?.propertyId, token]);

  const sellerChatbot = useSellerChatbot({
    propertyId: estimate?.propertyId ?? '',
    estimate,
    hasHighBuyerInterest,
    token,
    onEngagementUpdated: setEstimate,
  });

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
              {estimate.buyerTracking && token && (
                <button
                  type="button"
                  className={styles.newEstimateButton}
                  onClick={() => setShowPotentialBuyers(true)}
                >
                  Potential Buyers
                </button>
              )}
            </div>
            <EstimateResult estimate={estimate} />

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
              title="Would you like to track buyer demand anonymously?"
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
              title="At what price would you seriously consider selling?"
              dismissLabel="Close"
            >
              <SellerPriceEntryForm
                onSubmit={sellerChatbot.onPriceSubmit}
                onSkip={sellerChatbot.onPriceSkip}
              />
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
              open={showPotentialBuyers}
              onClose={() => setShowPotentialBuyers(false)}
              propertyId={estimate.propertyId}
              token={token ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
