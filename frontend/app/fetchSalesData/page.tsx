'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { processDataService } from '@/services/process-data.service';
import styles from './page.module.css';

interface BatchStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  pagesFetched?: number;
  totalRecords?: number;
  savedRecords?: number;
  message?: string;
  error?: string;
  jobId?: string;
  startTime?: number;
  params?: {
    anneemut_min: number;
    anneemut_max: number;
    code_insee: string;
  };
}

const STORAGE_KEY = 'fetchSalesData_batchJob';
const JOB_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes timeout

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
  const [isRestored, setIsRestored] = useState(false);
  const isMountedRef = useRef(true);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Periodically check localStorage for status updates (in case fetch completes in another tab/window)
  useEffect(() => {
    const interval = setInterval(() => {
      if (batchStatus.status === 'running') {
        const storedJob = localStorage.getItem(STORAGE_KEY);
        if (storedJob) {
          try {
            const job: BatchStatus = JSON.parse(storedJob);
            // If stored job status is different from current, update
            if (job.status !== batchStatus.status || 
                job.totalRecords !== batchStatus.totalRecords ||
                job.savedRecords !== batchStatus.savedRecords) {
              console.log('Status update detected in localStorage:', job);
              setBatchStatus(job);
              if (job.status === 'completed' || job.status === 'error') {
                setIsRestored(false);
              }
            }
          } catch (error) {
            console.error('Failed to parse stored job status:', error);
          }
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [batchStatus.status, batchStatus.totalRecords, batchStatus.savedRecords]);

  // Restore job status from localStorage on mount
  useEffect(() => {
    const storedJob = localStorage.getItem(STORAGE_KEY);
    if (storedJob) {
      try {
        const job: BatchStatus = JSON.parse(storedJob);
        
        // Restore the job status as-is (don't change running to completed)
        setBatchStatus(job);
        setIsRestored(true);
        
        // Restore form data if available
        if (job.params) {
          setFormData({
            anneemut_min: String(job.params.anneemut_min),
            anneemut_max: String(job.params.anneemut_max),
            code_insee: job.params.code_insee,
          });
        }

        // If job was running, check if enough time has passed that it might have completed
        if (job.status === 'running' && job.startTime) {
          const elapsed = Date.now() - job.startTime;
          // If job has been running for more than 5 minutes, it likely completed
          if (elapsed > 5 * 60 * 1000) {
            const updatedJob = {
              ...job,
              message: 'Job was running when you navigated away. Since backend processes synchronously, the job may have completed, but results are not available. Please check the database or run the job again if needed.',
            };
            setBatchStatus(updatedJob);
            // Update localStorage with the message
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJob));
          }
        }
      } catch (error) {
        console.error('Failed to parse stored job status:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.userRole !== 'admin') {
      router.push('/');
    }
  }, [session?.userRole, sessionStatus, router]);

  // Show loading state while checking session
  if (sessionStatus === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (sessionStatus === 'authenticated' && session?.userRole !== 'admin') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const anneemut_min = parseInt(formData.anneemut_min);
    const anneemut_max = parseInt(formData.anneemut_max);
    const code_insee = formData.code_insee.trim();

    // Validation
    if (!anneemut_min || !anneemut_max || !code_insee) {
      const errorStatus: BatchStatus = {
        status: 'error',
        error: 'All fields are required',
      };
      setBatchStatus(errorStatus);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errorStatus));
      return;
    }

    if (anneemut_min > anneemut_max) {
      const errorStatus: BatchStatus = {
        status: 'error',
        error: 'Minimum year must be less than or equal to maximum year',
      };
      setBatchStatus(errorStatus);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errorStatus));
      return;
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const params = { anneemut_min, anneemut_max, code_insee };

    // Reset status and start batch
    const runningStatus: BatchStatus = {
      status: 'running',
      pagesFetched: 0,
      message: 'Initializing batch job...',
      jobId,
      startTime,
      params,
    };
    setBatchStatus(runningStatus);
    setIsRestored(false); // New job, not restored
    // Store in localStorage immediately
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runningStatus));

    try {
      const token = session?.backendToken;
      if (!token) {
        throw new Error('Not authenticated');
      }

      setBatchStatus((prev) => ({
        ...prev,
        message: 'Sending request to backend...',
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...runningStatus,
        message: 'Sending request to backend...',
      }));

      const data = await processDataService.process(
        { anneemut_min, anneemut_max, code_insee },
        token
      );

      const completedStatus: BatchStatus = {
        status: 'completed',
        totalRecords: data.totalRecords ?? 0,
        savedRecords: data.savedRecords ?? 0,
        message: data.message || 'Batch job completed successfully!',
        jobId,
        startTime,
        params,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedStatus));
      setBatchStatus(completedStatus);
      setIsRestored(false);
    } catch (error) {
      console.error('Error processing batch job:', error);
      const errorStatus: BatchStatus = {
        status: 'error',
        error: error instanceof Error ? error.message : 'An error occurred',
        jobId,
        startTime,
        params,
      };
      
      // Always update localStorage first
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errorStatus));
      
      // Update state immediately - React will handle batching
      setBatchStatus(errorStatus);
      setIsRestored(false); // Fresh error
      
      console.log('State updated to error');
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
    setIsRestored(false);
    // Clear stored job status
    localStorage.removeItem(STORAGE_KEY);
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
            {isRestored && (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: batchStatus.status === 'running' ? '#fff3cd' : '#e3f2fd', 
                borderRadius: '4px', 
                marginBottom: '16px',
                fontSize: '14px',
                color: batchStatus.status === 'running' ? '#856404' : '#1976d2'
              }}>
                {batchStatus.status === 'running' 
                  ? '⚠️ Job status restored from previous session. The job may still be running on the backend or may have completed while you were away.'
                  : 'ℹ️ Job status restored from previous session'}
              </div>
            )}
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

              {(batchStatus.totalRecords !== undefined || batchStatus.savedRecords !== undefined) && (
                <>
                  <div className={styles.statusCard}>
                    <div className={styles.statusLabel}>Total Records</div>
                    <div className={styles.statusValue}>
                      {batchStatus.totalRecords !== undefined 
                        ? batchStatus.totalRecords.toLocaleString() 
                        : '-'}
                    </div>
                  </div>
                  <div className={styles.statusCard}>
                    <div className={styles.statusLabel}>Saved Records</div>
                    <div className={styles.statusValue}>
                      {batchStatus.savedRecords !== undefined 
                        ? batchStatus.savedRecords.toLocaleString() 
                        : '-'}
                    </div>
                  </div>
                </>
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
