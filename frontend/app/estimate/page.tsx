'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import EstimateResult from '@/components/EstimateResult';
import type { PropertyEstimateResponse } from '@/types/estimate';
import styles from './page.module.css';

export default function EstimatePage() {
  const [estimate, setEstimate] = useState<PropertyEstimateResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('latestEstimate');
    if (stored) {
      try {
        setEstimate(JSON.parse(stored));
      } catch {
        setEstimate(null);
      }
    }
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Estimate</h1>
          <p className={styles.subtitle}>
            Here is the estimated value based on your selections.
          </p>
        </div>

        {!estimate && (
          <div className={styles.emptyState}>
            <p>We could not find a recent estimate.</p>
            <Link className={styles.backLink} href="/">
              Start a new estimate
            </Link>
          </div>
        )}

        {estimate && <EstimateResult estimate={estimate} />}
      </div>
    </main>
  );
}
