'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { propertyEstimateService } from '@/services/property-estimate.service';
import type { EstimateFeedback, PropertyEstimateResponse } from '@/types/estimate';

/** Every positive answer in create-property popups increases engagement by this amount. */
const ENGAGEMENT_DELTA_FEEDBACK = 4;
const ENGAGEMENT_DELTA_TRACKING = 4;
const ENGAGEMENT_DELTA_TRIGGER_PRICE = 4;

/** When engagement level reaches or crosses this value after an update, show schedule_call popup. */
const ENGAGEMENT_THRESHOLD_SCHEDULE_CALL = 10;

export interface UseSellerChatbotOptions {
  propertyId: string;
  estimate: PropertyEstimateResponse | null;
  hasHighBuyerInterest: boolean;
  token: string | undefined;
  /** When set (e.g. 10), only show feedback popup when estimate.engagementLevel > this value. Used on My Estimates after recalculate. */
  onlyShowIfEngagementLevelAbove?: number;
  /** Called when engagement is updated so parent can sync estimate state (e.g. setEstimate(updated)). */
  onEngagementUpdated?: (updated: PropertyEstimateResponse) => void;
}

export type SellerChatbotStep =
  | 'feedback'
  | 'track_demand'
  | 'price_entry'
  | 'thanks'
  | 'schedule_call'
  | 'schedule_call_confirmed'
  | null;

export interface UseSellerChatbotReturn {
  step: SellerChatbotStep;
  showFeedback: boolean;
  showTrackDemand: boolean;
  showPriceEntry: boolean;
  showThanks: boolean;
  showScheduleCall: boolean;
  showScheduleCallConfirmed: boolean;
  onFeedbackSelect: (feedback: EstimateFeedback) => void;
  onTrackDemandSelect: (yes: boolean) => void;
  onPriceSubmit: (price: number) => void;
  onPriceSkip: () => void;
  onScheduleCallSelect: (schedule: boolean) => void;
  closeScheduleCallConfirmed: () => void;
  closeModal: () => void;
  closeThanks: () => void;
}

function meetsScheduleCallThreshold(
  engagementLevel: number | undefined
): boolean {
  return (engagementLevel ?? 0) >= ENGAGEMENT_THRESHOLD_SCHEDULE_CALL;
}

export function useSellerChatbot({
  propertyId,
  estimate,
  hasHighBuyerInterest,
  token,
  onlyShowIfEngagementLevelAbove,
  onEngagementUpdated,
}: UseSellerChatbotOptions): UseSellerChatbotReturn {
  const [step, setStep] = useState<SellerChatbotStep>(null);
  const [showScheduleCallConfirmed, setShowScheduleCallConfirmed] = useState(false);
  const feedbackShownRef = useRef(false);
  const prevEngagementLevelRef = useRef<number | undefined>(undefined);

  const pendingScheduleCallRef = useRef(false);
  const scheduleCallTimerRef = useRef<number | null>(null);

  const clearScheduleCallTimer = useCallback(() => {
    if (scheduleCallTimerRef.current != null) {
      window.clearTimeout(scheduleCallTimerRef.current);
      scheduleCallTimerRef.current = null;
    }
  }, []);

  const computeShouldScheduleCall = useCallback(
    (engagementLevel: number | undefined): boolean => {
      return hasHighBuyerInterest || meetsScheduleCallThreshold(engagementLevel);
    },
    [hasHighBuyerInterest]
  );

  const enterThanksFromEstimate = useCallback(
    (currentEstimate: PropertyEstimateResponse | null | undefined) => {
      pendingScheduleCallRef.current = computeShouldScheduleCall(
        currentEstimate?.engagementLevel
      );
      setStep('thanks');
    },
    [computeShouldScheduleCall]
  );

  const advanceAfterAllAnswers = useCallback(
    (currentEstimate: PropertyEstimateResponse | null | undefined) => {
      clearScheduleCallTimer();
      if (!currentEstimate) {
        enterThanksFromEstimate(null);
        return;
      }

      // If seller hasn't enabled buyer tracking yet (unset OR explicitly false),
      // ask buyer tracking question first.
      if (currentEstimate.buyerTracking !== true) {
        setStep('track_demand');
        return;
      }

      // If buyer tracking is enabled but trigger price isn't set, ask for trigger price.
      if (currentEstimate.triggerPrice == null) {
        setStep('price_entry');
        return;
      }

      // Otherwise: everything required is answered, show thanks first.
      enterThanksFromEstimate(currentEstimate);
    },
    [clearScheduleCallTimer, enterThanksFromEstimate]
  );

  useEffect(() => {
    return () => clearScheduleCallTimer();
  }, [clearScheduleCallTimer]);

  const showFeedback = step === 'feedback';
  const showTrackDemand = step === 'track_demand';
  const showPriceEntry = step === 'price_entry';
  const showThanks = step === 'thanks';
  const showScheduleCall = step === 'schedule_call';
  const showScheduleCallConfirmedState =
    step === 'schedule_call_confirmed' || showScheduleCallConfirmed;

  const FEEDBACK_POPUP_DELAY_MS = 7000;

  useEffect(() => {
    if (!estimate?.propertyId) return;
    const level = estimate?.engagementLevel ?? 0;
    const threshold = onlyShowIfEngagementLevelAbove ?? -1;

    if (threshold >= 0 && level < threshold) {
      prevEngagementLevelRef.current = level;
      return;
    }

    if (
      threshold >= 0 &&
      (prevEngagementLevelRef.current ?? 0) < threshold &&
      level >= threshold
    ) {
      feedbackShownRef.current = false;
    }

    prevEngagementLevelRef.current = level;

    if (feedbackShownRef.current) return;

    const timer = window.setTimeout(() => {
      setStep('feedback');
    }, FEEDBACK_POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [estimate?.propertyId, estimate?.engagementLevel, onlyShowIfEngagementLevelAbove]);

  const closeModal = useCallback(() => {
    clearScheduleCallTimer();
    pendingScheduleCallRef.current = false;
    setStep(null);
    setShowScheduleCallConfirmed(false);
  }, [clearScheduleCallTimer]);

  const closeThanks = useCallback(() => {
    clearScheduleCallTimer();
    const shouldSchedule = pendingScheduleCallRef.current;
    pendingScheduleCallRef.current = false;
    setStep(null);

    if (shouldSchedule) {
      scheduleCallTimerRef.current = window.setTimeout(() => {
        setStep('schedule_call');
      }, 2000);
    }
  }, [clearScheduleCallTimer]);

  const onFeedbackSelect = useCallback(
    (feedback: EstimateFeedback) => {
      clearScheduleCallTimer();
      feedbackShownRef.current = true;

      if (!token) {
        advanceAfterAllAnswers(estimate);
        return;
      }

      propertyEstimateService
        .updateEngagement(
          propertyId,
          { feedback, engagementDelta: ENGAGEMENT_DELTA_FEEDBACK },
          token
        )
        .then((updated) => {
          onEngagementUpdated?.(updated);
          advanceAfterAllAnswers(updated);
        })
        .catch(() => {
          advanceAfterAllAnswers(estimate);
        });
    },
    [
      token,
      propertyId,
      estimate,
      onEngagementUpdated,
      clearScheduleCallTimer,
      advanceAfterAllAnswers,
    ]
  );

  const onTrackDemandSelect = useCallback(
    (yes: boolean) => {
      clearScheduleCallTimer();

      if (!token) {
        if (yes) {
          if (estimate?.triggerPrice == null) {
            setStep('price_entry');
          } else {
            enterThanksFromEstimate(estimate);
          }
        } else {
          enterThanksFromEstimate(estimate);
        }
        return;
      }

      if (yes) {
        propertyEstimateService
          .updateEngagement(
            propertyId,
            { buyerTracking: true, engagementDelta: ENGAGEMENT_DELTA_TRACKING },
            token
          )
          .then((updated) => {
            onEngagementUpdated?.(updated);
            advanceAfterAllAnswers(updated);
          })
          .catch(() => {
            if (estimate?.triggerPrice == null) setStep('price_entry');
            else enterThanksFromEstimate(estimate);
          });
      } else {
        propertyEstimateService
          .updateEngagement(
            propertyId,
            { buyerTracking: false },
            token
          )
          .then((updated) => {
            onEngagementUpdated?.(updated);
            // If seller explicitly answers "No" for tracking, don't re-ask this question.
            enterThanksFromEstimate(updated);
          })
          .catch(() => {
            enterThanksFromEstimate(estimate);
          });
      }
    },
    [
      token,
      propertyId,
      estimate,
      onEngagementUpdated,
      clearScheduleCallTimer,
      advanceAfterAllAnswers,
      enterThanksFromEstimate,
    ]
  );

  const onPriceSubmit = useCallback(
    (price: number) => {
      clearScheduleCallTimer();

      if (!token) {
        enterThanksFromEstimate(estimate);
        return;
      }

      propertyEstimateService
        .updateEngagement(
          propertyId,
          { triggerPrice: price, engagementDelta: ENGAGEMENT_DELTA_TRIGGER_PRICE },
          token
        )
        .then((updated) => {
          onEngagementUpdated?.(updated);
          advanceAfterAllAnswers(updated);
        })
        .catch(() => {
          enterThanksFromEstimate(estimate);
        });
    },
    [
      token,
      propertyId,
      estimate,
      onEngagementUpdated,
      clearScheduleCallTimer,
      advanceAfterAllAnswers,
      enterThanksFromEstimate,
    ]
  );

  const onPriceSkip = useCallback(() => {
    clearScheduleCallTimer();
    enterThanksFromEstimate(estimate);
  }, [clearScheduleCallTimer, enterThanksFromEstimate, estimate]);

  const onScheduleCallSelect = useCallback((schedule: boolean) => {
    clearScheduleCallTimer();
    pendingScheduleCallRef.current = false;
    setStep(null);
    if (schedule) {
      setShowScheduleCallConfirmed(true);
    }
  }, [clearScheduleCallTimer]);

  const closeScheduleCallConfirmed = useCallback(() => {
    setShowScheduleCallConfirmed(false);
  }, []);

  return {
    step,
    showFeedback,
    showTrackDemand,
    showPriceEntry,
    showThanks,
    showScheduleCall,
    showScheduleCallConfirmed: showScheduleCallConfirmedState,
    onFeedbackSelect,
    onTrackDemandSelect,
    onPriceSubmit,
    onPriceSkip,
    onScheduleCallSelect,
    closeScheduleCallConfirmed,
    closeModal,
    closeThanks,
  };
}

