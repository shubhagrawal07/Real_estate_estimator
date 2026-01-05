'use client';

import styles from './EstimateResult.module.css';

interface EstimateResultProps {
  estimate: {
    id: number;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    estimatedPrice: number;
    squareFeet: number;
    bedrooms: number;
    bathrooms: number;
    createdAt: string;
  };
}

export default function EstimateResult({ estimate }: EstimateResultProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const pricePerSqFt = Math.round(estimate.estimatedPrice / estimate.squareFeet);

  return (
    <div className={styles.result}>
      <div className={styles.resultHeader}>
        <h2>Estimated Market Value</h2>
        <div className={styles.price}>{formatPrice(estimate.estimatedPrice)}</div>
      </div>

      <div className={styles.resultDetails}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Property Address:</span>
          <span className={styles.detailValue}>
            {estimate.address}, {estimate.city}, {estimate.state} {estimate.zipCode}
          </span>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Square Feet:</span>
            <span className={styles.detailValue}>{estimate.squareFeet.toLocaleString()} sq ft</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Bedrooms:</span>
            <span className={styles.detailValue}>{estimate.bedrooms}</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Bathrooms:</span>
            <span className={styles.detailValue}>{estimate.bathrooms}</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Price per Sq Ft:</span>
            <span className={styles.detailValue}>{formatPrice(pricePerSqFt)}</span>
          </div>
        </div>

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
