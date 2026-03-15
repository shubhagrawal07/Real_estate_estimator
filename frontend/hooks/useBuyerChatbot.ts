'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { buyerEngagementService } from '@/services/buyer-engagement.service';
import type { BuyerSearchCriteria, FinancingStatus } from '@/types/estimate';

const ALERT_SEEN_KEY = 'buyer_chatbot_alert_seen';
const SEARCH_COUNT_KEY = 'buyer_search_count';
const ENGAGEMENT_DELTA_FINANCING = 2;

export interface UseBuyerChatbotOptions {
  token: string | undefined;
  searchCriteria: BuyerSearchCriteria | null;
  interestedCount: number;
}

export interface UseBuyerChatbotReturn {
  showAlertPrompt: boolean;
  dismissAlertPrompt: () => void;
  showFinancialStatus: boolean;
  financialStatusPropertyId: string | null;
  /** Key to force financial Modal to remount when opened (use as key={financialModalKey}). */
  financialModalKey: number;
  openFinancialStatus: (propertyId: string) => void;
  /** Close financial popup. When shouldReset is true (e.g. user clicked cross), resets engagement to 0. */
  closeFinancialStatus: (shouldReset?: boolean) => void;
  onFinancialStatusSelect: (status: FinancingStatus) => void;
  showScheduleCall: boolean;
  onScheduleCallSelect: (schedule: boolean) => void;
  showScheduleCallConfirmed: boolean;
  closeScheduleCallConfirmed: () => void;
}

export function useBuyerChatbot({
  token,
  searchCriteria,
}: UseBuyerChatbotOptions): UseBuyerChatbotReturn {
  const router = useRouter();
  const [showAlertPrompt, setShowAlertPrompt] = useState(false);
  const [showFinancialStatus, setShowFinancialStatus] = useState(false);
  const [financialStatusPropertyId, setFinancialStatusPropertyId] = useState<string | null>(null);
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [showScheduleCallConfirmed, setShowScheduleCallConfirmed] = useState(false);
  /** Increments each time we open the financial modal so the Modal remounts and shows reliably. */
  const [financialModalKey, setFinancialModalKey] = useState(0);
  /** Prevents late resetEngagement .finally() from closing the modal after user reopened it. */
  const closingFinancialRef = useRef(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(ALERT_SEEN_KEY);
    if (!seen) {
      setShowAlertPrompt(true);
    }
  }, []);

  const dismissAlertPrompt = useCallback(() => {
    sessionStorage.setItem(ALERT_SEEN_KEY, '1');
    setShowAlertPrompt(false);
  }, []);

  const openFinancialStatus = useCallback((propertyId: string) => {
    closingFinancialRef.current = false;
    setFinancialModalKey((k) => k + 1);
    setFinancialStatusPropertyId(propertyId);
    setShowFinancialStatus(true);
  }, []);

  const closeFinancialStatus = useCallback(
    (shouldReset = true) => {
      const propertyId = financialStatusPropertyId;
      const doClose = () => {
        if (!closingFinancialRef.current) return;
        setShowFinancialStatus(false);
        setFinancialStatusPropertyId(null);
      };
      if (shouldReset && propertyId && token) {
        closingFinancialRef.current = true;
        buyerEngagementService
          .resetEngagement(propertyId, token)
          .catch(() => {})
          .finally(doClose);
      } else {
        setShowFinancialStatus(false);
        setFinancialStatusPropertyId(null);
      }
    },
    [financialStatusPropertyId, token]
  );

  const onFinancialStatusSelect = useCallback(
    (status: FinancingStatus) => {
      const propertyId = financialStatusPropertyId;
      if (!token || !propertyId || !searchCriteria) {
        closeFinancialStatus(false);
        return;
      }

      if (status === 'ready_to_buy') {
        buyerEngagementService
          .updateFinancingStatus(propertyId, status, ENGAGEMENT_DELTA_FINANCING, token)
          .then(() => buyerEngagementService.resetEngagement(propertyId, token))
          .then(() => {
            closeFinancialStatus(false);
            setShowScheduleCall(true);
          })
          .catch(() => closeFinancialStatus(false));
        return;
      }

      if (status === 'in_progress' || status === 'not_yet') {
        buyerEngagementService
          .resetEngagement(propertyId, token)
          .then(() => closeFinancialStatus(false))
          .catch(() => closeFinancialStatus(false));
        return;
      }

      if (status === 'need_to_sell_first') {
        buyerEngagementService
          .updateFinancingStatus(
            propertyId,
            status,
            ENGAGEMENT_DELTA_FINANCING,
            token
          )
          .then(() => buyerEngagementService.resetEngagement(propertyId, token))
          .then(() => {
            closeFinancialStatus(false);
            router.push('/getEstimates');
          })
          .catch(() => closeFinancialStatus(false));
      }
    },
    [
      financialStatusPropertyId,
      token,
      searchCriteria,
      closeFinancialStatus,
      router,
    ]
  );

  const onScheduleCallSelect = useCallback((schedule: boolean) => {
    setShowScheduleCall(false);
    if (schedule) {
      setShowScheduleCallConfirmed(true);
    }
  }, []);

  const closeScheduleCallConfirmed = useCallback(() => {
    setShowScheduleCallConfirmed(false);
  }, []);

  return {
    showAlertPrompt,
    dismissAlertPrompt,
    showFinancialStatus,
    financialStatusPropertyId,
    financialModalKey,
    openFinancialStatus,
    closeFinancialStatus,
    onFinancialStatusSelect,
    showScheduleCall,
    onScheduleCallSelect,
    showScheduleCallConfirmed,
    closeScheduleCallConfirmed,
  };
}

export function incrementBuyerSearchCount(): void {
  try {
    const n = sessionStorage.getItem(SEARCH_COUNT_KEY);
    const next = n ? parseInt(n, 10) + 1 : 1;
    sessionStorage.setItem(SEARCH_COUNT_KEY, String(next));
  } catch {
    // ignore
  }
}
