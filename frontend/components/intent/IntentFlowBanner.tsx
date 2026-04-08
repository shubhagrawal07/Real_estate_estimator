'use client';

import styles from './IntentFlowBanner.module.css';

interface IntentFlowBannerProps {
  onReopen: () => void;
  onDismiss: () => void;
}

export function IntentFlowBanner({ onReopen, onDismiss }: IntentFlowBannerProps) {
  return (
    <div className={styles.banner} role="region" aria-label="Project reminder">
      <div className={styles.inner}>
        <p className={styles.text}>Still deciding? Tell us about your project so we can help.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onReopen}>
            Continue
          </button>
          <button type="button" className={styles.secondary} onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
