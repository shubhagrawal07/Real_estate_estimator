'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { propertyEstimateService } from '@/services/property-estimate.service';
import type { PotentialBuyerEntry } from '@/types/estimate';
import styles from './PotentialBuyersModal.module.css';

export interface PotentialBuyersModalProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  token: string | undefined;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatBudget(entry: PotentialBuyerEntry): string {
  if (entry.budget == null || entry.budget <= 0) return '—';
  return formatPrice(entry.budget);
}

function formatCriteria(entry: PotentialBuyerEntry): string {
  if (entry.criteriaSummary) return entry.criteriaSummary;
  return `${entry.bedrooms} bed · ${entry.surfaceMin} m² min`;
}

export default function PotentialBuyersModal({
  open,
  onClose,
  propertyId,
  token,
}: PotentialBuyersModalProps) {
  const [list, setList] = useState<PotentialBuyerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !propertyId || !token) {
      setList([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    propertyEstimateService
      .getPotentialBuyers(propertyId, token)
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        setList([]);
        setError(err instanceof Error ? err.message : 'Failed to load potential buyers');
      })
      .finally(() => setLoading(false));
  }, [open, propertyId, token]);

  return (
    <Modal open={open} onClose={onClose} title="Potential Buyers" dismissLabel="Close">
      <div className={styles.content}>
        {loading && <p className={styles.message}>Loading…</p>}
        {error && !loading && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {!loading && !error && list.length === 0 && (
          <p className={styles.message}>No potential buyers yet.</p>
        )}
        {!loading && !error && list.length > 0 && (
          <ul className={styles.list} aria-label="Potential buyers">
            {list.map((entry, index) => (
              <li
                key={`${entry.engagementLevel}-${entry.budget ?? 'x'}-${entry.criteriaSummary ?? index}-${index}`}
                className={styles.item}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <div className={styles.itemContent}>
                  <span className={styles.budget}>{formatBudget(entry)}</span>
                  <span className={styles.criteria}>{formatCriteria(entry)}</span>
                </div>
                <span className={styles.status}>
                  {entry.interested ? 'Interested' : 'Considering'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
