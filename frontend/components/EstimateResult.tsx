'use client';

import styles from './EstimateResult.module.css';
import { getPriceRangeIn5000 } from '@/lib/price-range';

interface EstimateResultProps {
  estimate: {
    propertyId?: string;
    address: string;
    postalCode?: number;
    department?: string;
    municipality?: string;
    cadastralSection?: string;
    estimatedPrice?: number;
    basePricePerSqM?: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    floors?: number;
    type?: string;
    hasBalcony?: boolean;
    hasParking?: boolean;
    ownershipType?: string;
    deadline?: string;
    condition?: string;
    createdDate?: string;
    [key: string]: unknown;
  };
}

export default function EstimateResult({ estimate }: EstimateResultProps) {
  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Use basePricePerSqM from API if available, otherwise calculate from estimatedPrice
  const pricePerSqM = estimate.basePricePerSqM 
    ? Math.round(estimate.basePricePerSqM)
    : (estimate.estimatedPrice && estimate.area 
      ? Math.round(estimate.estimatedPrice / estimate.area) 
      : 0);

  const hasKnownAddress =
    Boolean(estimate.address) &&
    estimate.address.toLowerCase() !== 'unknown' &&
    (estimate.postalCode == null || estimate.postalCode > 0);

  const hasKnownLocation =
    Boolean(estimate.municipality) &&
    String(estimate.municipality).toLowerCase() !== 'unknown';

  return (
    <div className={styles.result}>
      <div className={styles.resultHeader}>
        <h2>Estimated Market Value</h2>
        <div className={styles.price}>
          {estimate.estimatedPrice
            ? (() => {
                const { min, max } = getPriceRangeIn5000(estimate.estimatedPrice);
                return `${formatPrice(min)} – ${formatPrice(max)}`;
              })()
            : 'Calculating...'}
        </div>
      </div>

      <div className={styles.resultDetails}>
        {hasKnownAddress && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Property Address:</span>
            <span className={styles.detailValue}>
              {estimate.address}
              {estimate.postalCode != null && `, ${estimate.postalCode}`}
            </span>
          </div>
        )}

        {hasKnownLocation && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Location:</span>
            <span className={styles.detailValue}>
              {[estimate.municipality, estimate.department].filter(Boolean).join(', ')}
              {estimate.cadastralSection && ` (${estimate.cadastralSection})`}
            </span>
          </div>
        )}

        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Area:</span>
            <span className={styles.detailValue}>
              {estimate.area?.toLocaleString() || 'N/A'} m²
            </span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Property Type:</span>
            <span className={styles.detailValue}>{estimate.type || 'N/A'}</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Bedrooms:</span>
            <span className={styles.detailValue}>{estimate.bedrooms || 'N/A'}</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Bathrooms:</span>
            <span className={styles.detailValue}>{estimate.bathrooms || 'N/A'}</span>
          </div>

          {estimate.floors !== undefined && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Floors:</span>
              <span className={styles.detailValue}>{estimate.floors}</span>
            </div>
          )}

          {pricePerSqM > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Price per m²:</span>
              <span className={styles.detailValue}>{formatPrice(pricePerSqM)}</span>
            </div>
          )}
        </div>

        {(estimate.hasBalcony || estimate.hasParking || estimate.condition) && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Features:</span>
            <span className={styles.detailValue}>
              {[
                estimate.hasBalcony && 'Balcony',
                estimate.hasParking && 'Parking',
                estimate.condition && `Condition: ${estimate.condition}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>
        )}

        <div className={styles.disclaimer}>
          <p>
            <strong>Note:</strong> This is an estimated value based on the provided information.
            For a professional appraisal, please consult with a licensed real estate appraiser.
          </p>
        </div>
      </div>
    </div>
  );
}
