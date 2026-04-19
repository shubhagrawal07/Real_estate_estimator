'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './IntentToastListener.module.css';

const AREA_MSG = 'Area saved. You\'ll receive price updates.';

export function IntentToastListener() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(AREA_MSG);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const onWatch = () => {
      clearTimer();
      setMessage(AREA_MSG);
      setVisible(true);
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, 4000);
    };

    const onBuyerIntent = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      if (!detail?.message) return;
      clearTimer();
      setMessage(detail.message);
      setVisible(true);
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        hideTimerRef.current = null;
      }, 4000);
    };

    window.addEventListener('intent:areaWatchToast', onWatch);
    window.addEventListener('buyer-intent:toast', onBuyerIntent);
    return () => {
      clearTimer();
      window.removeEventListener('intent:areaWatchToast', onWatch);
      window.removeEventListener('buyer-intent:toast', onBuyerIntent);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.toast} role="status">
      {message}
    </div>
  );
}
