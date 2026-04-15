'use client';

import { useEffect, useState } from 'react';
import styles from './IntentToastListener.module.css';

const MSG = 'Area saved. You\'ll receive price updates.';

export function IntentToastListener() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onWatch = () => {
      setVisible(true);
      window.setTimeout(() => setVisible(false), 4000);
    };
    window.addEventListener('intent:areaWatchToast', onWatch);
    return () => window.removeEventListener('intent:areaWatchToast', onWatch);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.toast} role="status">
      {MSG}
    </div>
  );
}
