'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import PropertyEstimateForm from '@/components/PropertyEstimateForm';
import EstimateResult from '@/components/EstimateResult';
import MyEstimatesSidebar from '@/components/MyEstimatesSidebar';
import styles from './page.module.css';

export default function Home() {
  const { data: session } = useSession();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Link draft estimates when user logs in
  useEffect(() => {
    if (session && (session as any).backendToken) {
      linkDraftEstimates();
    }
  }, [session]);

  const linkDraftEstimates = async () => {
    const draftEstimates = localStorage.getItem('draftEstimates');
    if (draftEstimates) {
      try {
        const propertyIds = JSON.parse(draftEstimates);
        if (propertyIds.length > 0) {
          const token = (session as any).backendToken;
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/link-drafts`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ propertyIds }),
            }
          );
          // Clear draft estimates from localStorage
          localStorage.removeItem('draftEstimates');
        }
      } catch (err) {
        console.error('Failed to link draft estimates:', err);
      }
    }
  };

  const handleEstimate = async (propertyData: any) => {
    setLoading(true);
    setError(null);
    setEstimate(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth token if user is logged in
      if (session && (session as any).backendToken) {
        headers['Authorization'] = `Bearer ${(session as any).backendToken}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(propertyData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Store estimate in localStorage and redirect to landing page
      localStorage.setItem('latestEstimate', JSON.stringify(data));
      
      // If user is not logged in, store the property ID as draft
      if (!session) {
        const draftEstimates = JSON.parse(localStorage.getItem('draftEstimates') || '[]');
        draftEstimates.push(data.propertyId);
        localStorage.setItem('draftEstimates', JSON.stringify(draftEstimates));
      }
      
      // Redirect to landing page
      window.location.href = `/estimate?id=${data.propertyId}`;
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please make sure the backend is running on http://localhost:3001');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred while getting the estimate');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.navbar}>
        <div className={styles.navContent}>
          {session ? (
            <>
              <button
                className={styles.myEstimatesButton}
                onClick={() => setSidebarOpen(true)}
              >
                My Estimates
              </button>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{session.user?.name || session.user?.email}</span>
                <button className={styles.signOutButton} onClick={() => signOut()}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <button className={styles.signInButton} onClick={() => signIn('google')}>
              Sign in with Google
            </button>
          )}
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Real Estate Price Estimator</h1>
          <p className={styles.subtitle}>
            Get an instant estimate of your property's current market value
          </p>
        </div>

        <div className={styles.content}>
          <PropertyEstimateForm onSubmit={handleEstimate} loading={loading} />
          
          {error && (
            <div className={styles.error}>
              <p>Error: {error}</p>
            </div>
          )}

          {estimate && <EstimateResult estimate={estimate} />}
        </div>
      </div>

      {session && (
        <MyEstimatesSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onEstimateSelect={(estimate) => {
            window.location.href = `/estimate?id=${estimate.propertyId}`;
          }}
        />
      )}
    </main>
  );
}
