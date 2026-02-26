'use client';

import styles from './EstimateDisplay.module.css';
import { getPriceRangeIn5000 } from '@/lib/price-range';

interface PropertyEstimate {
  propertyId: string;
  address: string;
  postalCode: number;
  department: string;
  municipality: string;
  cadastralSection: string;
  type: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
  ownershipType: string;
  deadline: string;
  condition?: string;
  estimatedPrice?: number;
  basePricePerSqM?: number;
  status: string;
  createdDate: string;
}

interface EstimateDisplayProps {
  estimate: PropertyEstimate;
  onRecalculate: () => void;
  loading: boolean;
}

export default function EstimateDisplay({ estimate, onRecalculate, loading }: EstimateDisplayProps) {
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleRecalculate = () => {
    onRecalculate();
  };

  return (
    <div className={styles.container}>
      <div className={styles.estimateCard}>
        {/* Estimated Value Section */}
        <div className={styles.priceSection}>
          <div className={styles.priceLabel}>Estimated Property Value</div>
          <div className={styles.priceValue}>
            {estimate.estimatedPrice
              ? (() => {
                  const { min, max } = getPriceRangeIn5000(estimate.estimatedPrice);
                  return `${formatPrice(min)} – ${formatPrice(max)}`;
                })()
              : 'N/A'}
          </div>
          <div className={styles.priceSubtext}>
            Calculated on {formatDate(estimate.createdDate)}
          </div>
        </div>

        {/* Property Summary */}
        <div className={styles.summarySection}>
          <h3 className={styles.sectionTitle}>Property Summary</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Address</span>
              <span className={styles.summaryValue}>{estimate.address}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Postal Code</span>
              <span className={styles.summaryValue}>{estimate.postalCode}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Location</span>
              <span className={styles.summaryValue}>
                {estimate.municipality}, {estimate.department}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Property Type</span>
              <span className={styles.summaryValue}>{estimate.type}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Area</span>
              <span className={styles.summaryValue}>{estimate.area} m²</span>
            </div>
            {estimate.basePricePerSqM && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Price per m²</span>
                <span className={styles.summaryValue}>{formatPrice(Math.round(estimate.basePricePerSqM))}</span>
              </div>
            )}
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Bedrooms</span>
              <span className={styles.summaryValue}>{estimate.bedrooms}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Bathrooms</span>
              <span className={styles.summaryValue}>{estimate.bathrooms}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Floors</span>
              <span className={styles.summaryValue}>{estimate.floors}</span>
            </div>
            {estimate.condition && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Condition</span>
                <span className={styles.summaryValue}>{estimate.condition}</span>
              </div>
            )}
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Features</span>
              <span className={styles.summaryValue}>
                {estimate.hasBalcony && 'Balcony '}
                {estimate.hasParking && 'Parking'}
                {!estimate.hasBalcony && !estimate.hasParking && 'None'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Ownership</span>
              <span className={styles.summaryValue}>{estimate.ownershipType}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Status</span>
              <span className={`${styles.statusBadge} ${styles[estimate.status]}`}>
                {estimate.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Recalculate Section */}
        <div className={styles.recalculateSection}>
          <button
            className={styles.recalculateButton}
            onClick={handleRecalculate}
            disabled={loading}
          >
            {loading ? 'Recalculating...' : 'Recalculate Estimate'}
          </button>
          {loading && (
            <p className={styles.recalculateNote}>
              Recalculating price based on current property details...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

