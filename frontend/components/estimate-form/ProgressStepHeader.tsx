'use client';

import React from 'react';
import styles from '../PropertyEstimateForm.module.css';

interface ProgressStepHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  progressPercent: number;
}

export const ProgressStepHeader = React.memo(function ProgressStepHeader({
  currentStep,
  totalSteps,
  stepLabels,
  progressPercent,
}: ProgressStepHeaderProps) {
  return (
    <>
      <div className={styles.progressHeader}>
        <span>
          Step {currentStep} / {totalSteps}
        </span>
        <span>{stepLabels[currentStep - 1]}</span>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </>
  );
});
