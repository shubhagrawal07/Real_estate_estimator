'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface BatchStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  pagesFetched?: number;
  totalRecords?: number;
  savedRecords?: number;
  message?: string;
  error?: string;
}

export default function FetchSalesDataPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    anneemut_min: '',
    anneemut_max: '',
    code_insee: '',
  });
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({
    status: 'idle',
  });

  // Redirect if not admin (after session is loaded)
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const userRole = (session as any)?.userRole;
      if (userRole !== 'admin') {
        router.push('/');
      }
    }
  }, [session, sessionStatus, router]);

  // Show loading state while checking session
  if (sessionStatus === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Don't render if not admin
  if (sessionStatus === 'authenticated' && (session as any)?.userRole !== 'admin') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const anneemut_min = parseInt(formData.anneemut_min);
    const anneemut_max = parseInt(formData.anneemut_max);
    const code_insee = formData.code_insee.trim();

    // Validation
    if (!anneemut_min || !anneemut_max || !code_insee) {
      setBatchStatus({
        status: 'error',
        error: 'All fields are required',
      });
      return;
    }

    if (anneemut_min > anneemut_max) {
      setBatchStatus({
        status: 'error',
        error: 'Minimum year must be less than or equal to maximum year',
      });
      return;
    }

    // Reset status and start batch
    setBatchStatus({
      status: 'running',
      pagesFetched: 0,
      message: 'Initializing batch job...',
    });

    try {
      const token = (session as any)?.backendToken;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/process-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            anneemut_min,
            anneemut_max,
            code_insee,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process data');
      }

      // Update status with results
      setBatchStatus({
        status: 'completed',
        totalRecords: data.totalRecords ?? 0,
        savedRecords: data.savedRecords ?? 0,
        message: data.message || 'Batch job completed successfully!',
      });
    } catch (error) {
      setBatchStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      anneemut_min: '',
      anneemut_max: '',
      code_insee: '',
    });
    setBatchStatus({ status: 'idle' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fetch Sales Data</h1>
        <p className={styles.subtitle}>
          Process real estate mutation data from French DVF API
        </p>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="anneemut_min" className={styles.label}>
              Minimum Mutation Year
            </label>
            <input
              type="number"
              id="anneemut_min"
              name="anneemut_min"
              value={formData.anneemut_min}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="e.g., 2020"
              min="2000"
              max="2030"
              required
              disabled={batchStatus.status === 'running'}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="anneemut_max" className={styles.label}>
              Maximum Mutation Year
            </label>
            <input
              type="number"
              id="anneemut_max"
              name="anneemut_max"
              value={formData.anneemut_max}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="e.g., 2023"
              min="2000"
              max="2030"
              required
              disabled={batchStatus.status === 'running'}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="code_insee" className={styles.label}>
              City Code (INSEE)
            </label>
            <input
              type="text"
              id="code_insee"
              name="code_insee"
              value={formData.code_insee}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="e.g., 83137"
              required
              disabled={batchStatus.status === 'running'}
            />
            <small className={styles.helpText}>
              French municipality identifier (e.g., 83137 for Toulon)
            </small>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={batchStatus.status === 'running'}
            >
              {batchStatus.status === 'running' ? 'Processing...' : 'Start Batch Job'}
            </button>
            {(batchStatus.status === 'completed' || batchStatus.status === 'error') && (
              <button
                type="button"
                onClick={resetForm}
                className={styles.resetButton}
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {/* Status Display */}
        {batchStatus.status !== 'idle' && (
          <div className={styles.statusContainer}>
            <div className={styles.statusHeader}>
              <h2 className={styles.statusTitle}>Batch Job Status</h2>
              <div
                className={`${styles.statusIndicator} ${
                  styles[`status${batchStatus.status.charAt(0).toUpperCase() + batchStatus.status.slice(1)}`]
                }`}
              >
                {batchStatus.status === 'running' && (
                  <span className={styles.spinner}></span>
                )}
                {batchStatus.status === 'completed' && '✓'}
                {batchStatus.status === 'error' && '✕'}
              </div>
            </div>

            <div className={styles.statusGrid}>
              <div className={styles.statusCard}>
                <div className={styles.statusLabel}>Status</div>
                <div className={styles.statusValue}>
                  {batchStatus.status === 'running' && 'Running'}
                  {batchStatus.status === 'completed' && 'Completed'}
                  {batchStatus.status === 'error' && 'Error'}
                </div>
              </div>

              {batchStatus.pagesFetched !== undefined && (
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Pages Fetched</div>
                  <div className={styles.statusValue}>
                    {batchStatus.pagesFetched > 0 ? batchStatus.pagesFetched : '-'}
                  </div>
                </div>
              )}

              {batchStatus.totalRecords !== undefined && batchStatus.status === 'completed' && (
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Total Records</div>
                  <div className={styles.statusValue}>
                    {(batchStatus.totalRecords ?? 0).toLocaleString()}
                  </div>
                </div>
              )}

              {batchStatus.savedRecords !== undefined && batchStatus.status === 'completed' && (
                <div className={styles.statusCard}>
                  <div className={styles.statusLabel}>Saved Records</div>
                  <div className={styles.statusValue}>
                    {(batchStatus.savedRecords ?? 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {batchStatus.message && (
              <div className={styles.message}>
                {batchStatus.message}
              </div>
            )}

            {batchStatus.error && (
              <div className={styles.error}>
                {batchStatus.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
