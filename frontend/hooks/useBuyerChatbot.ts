'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buyerEngagementService } from '@/services/buyer-engagement.service';
import type { BuyerSearchCriteria, FinancingStatus } from '@/types/estimate';

const ALERT_SEEN_KEY = 'buyer_chatbot_alert_seen';
const SEARCH_COUNT_KEY = 'buyer_search_count';
const ENGAGEMENT_DELTA_FINANCING = 2;
const ENGAGEMENT_DELTA_SCHEDULE_YES = 1;

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
  openFinancialStatus: (propertyId: string) => void;
  closeFinancialStatus: () => void;
  onFinancialStatusSelect: (status: FinancingStatus) => void;
  showScheduleCall: boolean;
  onScheduleCallSelect: (schedule: boolean) => void;
  showScheduleCallConfirmed: boolean;
  closeScheduleCallConfirmed: () => void;
}

export function useBuyerChatbot({
  token,
  searchCriteria,
  interestedCount,
}: UseBuyerChatbotOptions): UseBuyerChatbotReturn {
  const router = useRouter();
  const [showAlertPrompt, setShowAlertPrompt] = useState(false);
  const [showFinancialStatus, setShowFinancialStatus] = useState(false);
  const [financialStatusPropertyId, setFinancialStatusPropertyId] = useState<string | null>(null);
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [showScheduleCallConfirmed, setShowScheduleCallConfirmed] = useState(false);

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
    setFinancialStatusPropertyId(propertyId);
    setShowFinancialStatus(true);
  }, []);

  const closeFinancialStatus = useCallback(() => {
    setShowFinancialStatus(false);
    setFinancialStatusPropertyId(null);
  }, []);

  const getSearchCount = useCallback((): number => {
    try {
      const n = sessionStorage.getItem(SEARCH_COUNT_KEY);
      return n ? Math.max(0, parseInt(n, 10)) : 0;
    } catch {
      return 0;
    }
  }, []);

  const onFinancialStatusSelect = useCallback(
    (status: FinancingStatus) => {
      const propertyId = financialStatusPropertyId;
      if (!token || !propertyId || !searchCriteria) {
        closeFinancialStatus();
        return;
      }
      buyerEngagementService
        .updateFinancingStatus(propertyId, status, ENGAGEMENT_DELTA_FINANCING, token)
        .then(() => {
          closeFinancialStatus();
          if (status === 'need_to_sell_first') {
            router.push('/getEstimates');
            return;
          }
          const searchCount = getSearchCount();
          const shouldOfferScheduleCall =
            status === 'ready_to_buy' || interestedCount >= 2 || searchCount > 1;
          if (shouldOfferScheduleCall) {
            setShowScheduleCall(true);
          }
        })
        .catch(() => {
          closeFinancialStatus();
        });
    },
    [
      financialStatusPropertyId,
      token,
      searchCriteria,
      interestedCount,
      closeFinancialStatus,
      router,
      getSearchCount,
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
