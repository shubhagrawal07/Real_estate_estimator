'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import MyEstimatesSidebar from '@/components/MyEstimatesSidebar';
import EstimateDisplay from '@/components/EstimateDisplay';
import styles from './page.module.css';

export default function EstimatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Link draft estimates when user logs in
  useEffect(() => {
    if (session && (session as any).backendToken) {
      linkDraftEstimates();
    }
  }, [session]);

  useEffect(() => {
    // Get estimate from URL params or localStorage
    const estimateId = searchParams.get('id');
    if (estimateId) {
      fetchEstimate(estimateId);
    } else {
      // Try to get from localStorage (from form submission)
      const savedEstimate = localStorage.getItem('latestEstimate');
      if (savedEstimate) {
        try {
          const estimate = JSON.parse(savedEstimate);
          setCurrentEstimate(estimate);
          localStorage.removeItem('latestEstimate');
        } catch (err) {
          console.error('Failed to parse saved estimate:', err);
        }
      }
    }
  }, [searchParams]);

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

  const fetchEstimate = async (estimateId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${estimateId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentEstimate(data);
      } else {
        console.error('Failed to fetch estimate');
      }
    } catch (error) {
      console.error('Error fetching estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEstimateSelect = async (estimate: any) => {
    // Fetch full estimate data
    await fetchEstimate(estimate.propertyId);
    setSidebarOpen(false);
    // Update URL without page reload
    router.push(`/estimate?id=${estimate.propertyId}`);
  };

  const handleRecalculate = async () => {
    if (!currentEstimate) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/${currentEstimate.propertyId}/recalculate`,
        {
          method: 'PUT',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to recalculate estimate');
      }

      const data = await response.json();
      setCurrentEstimate(data);
    } catch (error) {
      console.error('Error recalculating estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo} onClick={() => router.push('/')}>
            Real Estate Estimator
          </h1>
          <div className={styles.headerActions}>
            {session ? (
              <>
                <button
                  className={styles.myEstimatesButton}
                  onClick={() => setSidebarOpen(true)}
                >
                  My Estimation
                </button>
                <div className={styles.userSection}>
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className={styles.profileImage}
                    />
                  ) : (
                    <div className={styles.profileIcon}>
                      {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                    </div>
                  )}
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
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Welcome Section */}
        <div className={styles.welcomeSection}>
          <h2 className={styles.welcomeTitle}>Welcome!</h2>
          <p className={styles.welcomeDate}>{getWelcomeMessage()}</p>
        </div>

        {/* Estimate Display */}
        {loading ? (
          <div className={styles.loading}>Loading estimate...</div>
        ) : currentEstimate ? (
          <EstimateDisplay 
            estimate={currentEstimate} 
            onRecalculate={handleRecalculate}
            loading={loading}
          />
        ) : (
          <div className={styles.noEstimate}>
            <p>No estimate available. Please go back to create an estimate.</p>
            <button 
              className={styles.backButton}
              onClick={() => router.push('/')}
            >
              Create New Estimate
            </button>
          </div>
        )}
      </main>

      {/* Sidebar */}
      {session && (
        <MyEstimatesSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onEstimateSelect={handleEstimateSelect}
        />
      )}
    </div>
  );
}

