'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { propertyEstimateService } from '@/services/property-estimate.service';
import type { EstimateFeedback, PropertyEstimateResponse } from '@/types/estimate';

const ENGAGEMENT_DELTA_FEEDBACK = 2;
const ENGAGEMENT_DELTA_TRACKING = 2;
const ENGAGEMENT_DELTA_TRIGGER_PRICE = 1;

export interface UseSellerChatbotOptions {
  propertyId: string;
  estimate: PropertyEstimateResponse | null;
  hasHighBuyerInterest: boolean;
  token: string | undefined;
  /** When set (e.g. 10), only show feedback popup when estimate.engagementLevel > this value. Used on My Estimates after recalculate. */
  onlyShowIfEngagementLevelAbove?: number;
}

export type SellerChatbotStep =
  | 'feedback'
  | 'track_demand'
  | 'price_entry'
  | 'schedule_call'
  | 'schedule_call_confirmed'
  | null;

export interface UseSellerChatbotReturn {
  step: SellerChatbotStep;
  showFeedback: boolean;
  showTrackDemand: boolean;
  showPriceEntry: boolean;
  showScheduleCall: boolean;
  showScheduleCallConfirmed: boolean;
  onFeedbackSelect: (feedback: EstimateFeedback) => void;
  onTrackDemandSelect: (yes: boolean) => void;
  onPriceSubmit: (price: number) => void;
  onPriceSkip: () => void;
  onScheduleCallSelect: (schedule: boolean) => void;
  closeScheduleCallConfirmed: () => void;
  closeModal: () => void;
}

export function useSellerChatbot({
  propertyId,
  estimate,
  hasHighBuyerInterest,
  token,
  onlyShowIfEngagementLevelAbove,
}: UseSellerChatbotOptions): UseSellerChatbotReturn {
  const [step, setStep] = useState<SellerChatbotStep>(null);
  const [showScheduleCallConfirmed, setShowScheduleCallConfirmed] = useState(false);
  const feedbackShownRef = useRef(false);
  const prevEngagementLevelRef = useRef<number | undefined>(undefined);

  const showFeedback = step === 'feedback';
  const showTrackDemand = step === 'track_demand';
  const showPriceEntry = step === 'price_entry';
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
    if (threshold >= 0 && (prevEngagementLevelRef.current ?? 0) < threshold && level >= threshold) {
      feedbackShownRef.current = false;
    }
    prevEngagementLevelRef.current = level;
    if (feedbackShownRef.current) return;
    const timer = setTimeout(() => {
      setStep('feedback');
    }, FEEDBACK_POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [estimate?.propertyId, estimate?.engagementLevel, onlyShowIfEngagementLevelAbove]);

  const closeModal = useCallback(() => {
    setStep(null);
    setShowScheduleCallConfirmed(false);
  }, []);

  const tryShowScheduleCall = useCallback(() => {
    if (hasHighBuyerInterest) {
      setStep('schedule_call');
    } else {
      setStep(null);
    }
  }, [hasHighBuyerInterest]);

  const onFeedbackSelect = useCallback(
    (feedback: EstimateFeedback) => {
      if (!token) {
        feedbackShownRef.current = true;
        setStep('track_demand');
        return;
      }
      propertyEstimateService
        .updateEngagement(
          propertyId,
          { feedback, engagementDelta: ENGAGEMENT_DELTA_FEEDBACK },
          token
        )
        .then(() => {
          feedbackShownRef.current = true;
          setStep('track_demand');
        })
        .catch(() => {
          setStep('track_demand');
        });
    },
    [propertyId, token]
  );

  const onTrackDemandSelect = useCallback(
    (yes: boolean) => {
      if (!token) {
        if (yes) setStep('price_entry');
        else tryShowScheduleCall();
        return;
      }
      if (yes) {
        propertyEstimateService
          .updateEngagement(
            propertyId,
            { buyerTracking: true, engagementDelta: ENGAGEMENT_DELTA_TRACKING },
            token
          )
          .then(() => setStep('price_entry'))
          .catch(() => setStep('price_entry'));
      } else {
        tryShowScheduleCall();
      }
    },
    [propertyId, token, tryShowScheduleCall]
  );

  const onPriceSubmit = useCallback(
    (price: number) => {
      if (!token) {
        tryShowScheduleCall();
        return;
      }
      propertyEstimateService
        .updateEngagement(
          propertyId,
          {
            triggerPrice: price,
            engagementDelta: ENGAGEMENT_DELTA_TRIGGER_PRICE,
          },
          token
        )
        .then(() => tryShowScheduleCall())
        .catch(() => tryShowScheduleCall());
    },
    [propertyId, token, tryShowScheduleCall]
  );

  const onPriceSkip = useCallback(() => {
    tryShowScheduleCall();
  }, [tryShowScheduleCall]);

  const onScheduleCallSelect = useCallback((schedule: boolean) => {
    setStep(null);
    if (schedule) {
      setShowScheduleCallConfirmed(true);
    }
  }, []);

  const closeScheduleCallConfirmed = useCallback(() => {
    setShowScheduleCallConfirmed(false);
  }, []);

  return {
    step,
    showFeedback,
    showTrackDemand,
    showPriceEntry,
    showScheduleCall,
    showScheduleCallConfirmed: showScheduleCallConfirmedState,
    onFeedbackSelect,
    onTrackDemandSelect,
    onPriceSubmit,
    onPriceSkip,
    onScheduleCallSelect,
    closeScheduleCallConfirmed,
    closeModal,
  };
}
