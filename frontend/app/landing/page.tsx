'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EstimateResult from '@/components/EstimateResult';
import styles from './landing.module.css';

type Estimate = {
  propertyId?: string;
  address: string;
  postalCode: number;
  department: string;
  municipality: string;
  cadastralSection?: string;
  estimatedPrice?: number;
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
};

const mockBuyers = [
  { id: 1, budget: 505000, rooms: 4 },
  { id: 2, budget: 415000, rooms: 3 },
  { id: 3, budget: 320000, rooms: 3 },
  { id: 4, budget: 280000, rooms: 2 },
  { id: 5, budget: 245000, rooms: 2 },
  { id: 6, budget: 220000, rooms: 2 },
  { id: 7, budget: 198000, rooms: 1 },
];

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showBuyersPanel, setShowBuyersPanel] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('latestEstimate');
    if (saved) {
      setEstimate(JSON.parse(saved));
    }
  }, []);

  const propertyId = useMemo(() => searchParams.get('propertyId'), [searchParams]);

  const handleAuthClick = () => {
    setIsLoggedIn((prev) => !prev);
  };

  const goBack = () => {
    router.push('/');
  };

  const sortedBuyers = useMemo(
    () => [...mockBuyers].sort((a, b) => b.budget - a.budget),
    []
  );

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.addressBlock}>
          <p className={styles.label}>Property</p>
          <h1 className={styles.address}>
            {estimate ? `${estimate.address}, ${estimate.postalCode}` : 'Property Estimate'}
          </h1>
          {propertyId && <span className={styles.ref}>Ref: {propertyId}</span>}
        </div>
        <div className={styles.actions}>
          <button className={styles.authBtn} onClick={handleAuthClick}>
            {isLoggedIn ? 'Logout' : 'Login / Sign up'}
          </button>
          <button className={styles.backBtn} onClick={goBack}>Start Over</button>
        </div>
      </header>

      <section className={styles.hero}>
        {estimate ? (
          <EstimateResult estimate={estimate} />
        ) : (
          <div className={styles.placeholder}>
            <p>No estimate found. Please fill the form again.</p>
            <button className={styles.primary} onClick={goBack}>Go to Form</button>
          </div>
        )}
      </section>

      <section className={styles.buyers}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Potential Buyers</h2>
            <p>Budgets of buyers who match this property</p>
          </div>
          <button className={styles.viewBtn} onClick={() => setShowBuyersPanel(true)}>
            View buyers ({sortedBuyers.length})
          </button>
        </div>
        <div className={styles.buyerGrid}>
          {sortedBuyers.slice(0, 3).map((buyer, idx) => (
            <div key={buyer.id} className={styles.buyerCard}>
              <span className={styles.buyerLabel}>Top buyer #{idx + 1}</span>
              <span className={styles.buyerBudget}>
                {buyer.budget.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
              </span>
              <span className={styles.buyerRooms}>Looking for {buyer.rooms}+ rooms</span>
            </div>
          ))}
        </div>
      </section>

      {showBuyersPanel && (
        <div className={styles.drawerBackdrop} onClick={() => setShowBuyersPanel(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h3>{sortedBuyers.length} potential buyers found</h3>
                <p>Higher budgets are ranked first</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowBuyersPanel(false)}>×</button>
            </div>
            <div className={styles.drawerList}>
              {sortedBuyers.map((buyer, idx) => (
                <div key={buyer.id} className={styles.drawerItem}>
                  <div className={styles.buyerAvatar}>{idx + 1}</div>
                  <div className={styles.drawerItemBody}>
                    <p className={styles.drawerItemTitle}>Looking for {buyer.rooms} rooms or more</p>
                    <p className={styles.drawerItemBudget}>
                      Between{' '}
                      {buyer.budget.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}{' '}
                      and{' '}
                      {(buyer.budget * 1.1).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </p>
                    <p className={styles.drawerItemMeta}>Verified buyer · Ranked #{idx + 1}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.drawerFooter}>
              <button className={styles.primary}>Make an appointment</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

