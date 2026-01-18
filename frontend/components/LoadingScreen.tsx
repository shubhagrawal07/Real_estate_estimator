'use client';

import { useState, useEffect } from 'react';
import styles from './LoadingScreen.module.css';

interface LoadingStep {
  id: string;
  label: string;
  icon: string;
}

const loadingSteps: LoadingStep[] = [
  { id: 'fetching', label: 'Fetching information', icon: '🔍' },
  { id: 'analyzing', label: 'Analyzing property data', icon: '📊' },
  { id: 'calculating', label: 'Calculating estimate', icon: '🧮' },
  { id: 'finalizing', label: 'Finalizing results', icon: '✨' },
];

export default function LoadingScreen() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1500); // Change step every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>
        
        <div className={styles.stepsContainer}>
          {loadingSteps.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.step} ${
                index <= currentStepIndex ? styles.stepActive : ''
              } ${index < currentStepIndex ? styles.stepCompleted : ''}`}
            >
              <div className={styles.stepIcon}>
                <span className={styles.icon}>{step.icon}</span>
                {index < currentStepIndex && (
                  <div className={styles.checkmark}>✓</div>
                )}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
              {index === currentStepIndex && (
                <div className={styles.pulseDot}></div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((currentStepIndex + 1) / loadingSteps.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

