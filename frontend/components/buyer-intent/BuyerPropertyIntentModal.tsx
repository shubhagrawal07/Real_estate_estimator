'use client';

import { useEffect, useState } from 'react';
import { buyerIntentService } from '@/services/buyer-intent.service';
import styles from './BuyerPropertyIntentModal.module.css';

function toast(message: string): void {
  window.dispatchEvent(new CustomEvent('buyer-intent:toast', { detail: { message } }));
}

export interface BuyerIntentModalProperty {
  propertyId: string;
  address: string;
  budget?: number;
  cityInseeCode?: string;
  cadastralSection?: string;
  locationCode?: string;
}

interface BuyerPropertyIntentModalProps {
  open: boolean;
  onClose: () => void;
  property: BuyerIntentModalProperty | null;
  token: string | undefined;
  onSaved: (propertyId: string) => void;
  onAreaInterest?: (property: BuyerIntentModalProperty) => void;
}

type Step = 'menu' | 'question';

export function BuyerPropertyIntentModal({
  open,
  onClose,
  property,
  token,
  onSaved,
  onAreaInterest,
}: BuyerPropertyIntentModalProps) {
  const [step, setStep] = useState<Step>('menu');
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('menu');
      setQuestionText('');
      setSubmitting(false);
    }
  }, [open, property?.propertyId]);

  if (!open || !property) return null;

  const payloadBudget =
    typeof property.budget === 'number' && Number.isFinite(property.budget)
      ? Math.round(property.budget)
      : undefined;

  const runWithAuth = async (fn: (authToken: string) => Promise<void>) => {
    if (!token) {
      window.alert('Please log in to continue.');
      return;
    }
    const authToken = token;
    setSubmitting(true);
    try {
      await fn(authToken);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHighInterest = () => {
    void runWithAuth(async (authToken) => {
      await buyerIntentService.create(
        {
          propertyId: property.propertyId,
          intentType: 'HIGH_INTEREST',
          budget: payloadBudget,
        },
        authToken
      );
      onClose();
      toast('Got it. Your agent will follow up if this property opens up.');
      onSaved(property.propertyId);
    });
  };

  const handleAlert = () => {
    void runWithAuth(async (authToken) => {
      await buyerIntentService.create(
        {
          propertyId: property.propertyId,
          intentType: 'ALERT_AVAILABLE',
          budget: payloadBudget,
        },
        authToken
      );
      onClose();
      toast("Alert saved. You'll be notified if this property becomes available.");
      onSaved(property.propertyId);
    });
  };

  const handleArea = () => {
    void runWithAuth(async (authToken) => {
      await buyerIntentService.create(
        {
          propertyId: property.propertyId,
          intentType: 'AREA_INTEREST',
          budget: payloadBudget,
        },
        authToken
      );
      onClose();
      toast('Showing more properties in this area.');
      onSaved(property.propertyId);
      onAreaInterest?.(property);
    });
  };

  const handleSendQuestion = () => {
    const trimmed = questionText.trim();
    if (trimmed.length === 0) return;
    void runWithAuth(async (authToken) => {
      await buyerIntentService.create(
        {
          propertyId: property.propertyId,
          intentType: 'QUESTION',
          message: trimmed.slice(0, 300),
          budget: payloadBudget,
        },
        authToken
      );
      onClose();
      toast('Your question was sent. Expect a response within 24h.');
      onSaved(property.propertyId);
    });
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="buyer-intent-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeX} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className={styles.body}>
          {step === 'menu' ? (
            <>
              <h2 id="buyer-intent-title" className={styles.title}>
                Your interest in this property?
              </h2>
              <p className={styles.address}>{property.address}</p>
              <div className={styles.optionGrid}>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled={submitting}
                  onClick={handleHighInterest}
                >
                  ❤️ I&apos;m very interested
                </button>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled={submitting}
                  onClick={handleAlert}
                >
                  🔔 Alert me when available
                </button>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled={submitting}
                  onClick={handleArea}
                >
                  📍 I like this area
                </button>
                <button
                  type="button"
                  className={styles.optionBtn}
                  disabled={submitting}
                  onClick={() => {
                    if (!token) {
                      window.alert('Please log in to continue.');
                      return;
                    }
                    setStep('question');
                  }}
                >
                  💬 Ask an agent a question
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className={styles.backBtn} onClick={() => setStep('menu')}>
                ← Back
              </button>
              <h2 className={styles.title}>What would you like to know?</h2>
              <textarea
                className={styles.textarea}
                maxLength={300}
                placeholder="e.g. Is this property negotiable? What's the condition?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                aria-label="Your question"
              />
              <div className={styles.charCount}>{questionText.length} / 300</div>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={submitting || questionText.trim().length === 0}
                onClick={handleSendQuestion}
              >
                Send to agent
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
