'use client';

import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>Welcome to Real Estate Estimator</h1>
        <p className={styles.welcomeSubtitle}>
          Your trusted partner for accurate property valuations
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Why Real Estate Investment?</h2>
          <p className={styles.cardText}>
            Real estate investment has long been considered one of the most stable and profitable 
            investment strategies. Unlike stocks and bonds, real estate provides tangible assets 
            that typically appreciate over time while generating rental income.
          </p>
        </div>

        <div className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Market Trends</h2>
          <p className={styles.cardText}>
            The real estate market continues to show strong growth potential. Property values 
            have historically increased at an average rate of 3-5% annually, making real estate 
            a reliable long-term investment option.
          </p>
        </div>

        <div className={styles.infoCard}>
          <h2 className={styles.cardTitle}>Get Started</h2>
          <p className={styles.cardText}>
            Use our advanced estimation tool to get an accurate valuation of any property. 
            Our algorithm analyzes multiple factors including location, size, condition, and 
            market trends to provide you with the most reliable estimate.
          </p>
        </div>
      </div>
    </div>
  );
}
