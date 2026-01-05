'use client';

import { useState } from 'react';
import styles from './PropertyEstimateForm.module.css';

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
}

interface PropertyEstimateFormProps {
  onSubmit: (data: PropertyData) => void;
  loading: boolean;
}

export default function PropertyEstimateForm({
  onSubmit,
  loading,
}: PropertyEstimateFormProps) {
  const [formData, setFormData] = useState<PropertyData>({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    squareFeet: 0,
    bedrooms: 0,
    bathrooms: 0,
    yearBuilt: undefined,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'squareFeet' ||
        name === 'bedrooms' ||
        name === 'bathrooms' ||
        name === 'yearBuilt'
          ? value === '' ? undefined : Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="address">Street Address *</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="123 Main St"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="city">City *</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            placeholder="New York"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="state">State *</label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            placeholder="NY"
            maxLength={2}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="zipCode">ZIP Code *</label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            required
            placeholder="10001"
            pattern="[0-9]{5}"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="squareFeet">Square Feet *</label>
          <input
            type="number"
            id="squareFeet"
            name="squareFeet"
            value={formData.squareFeet || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="1500"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="bedrooms">Bedrooms *</label>
          <input
            type="number"
            id="bedrooms"
            name="bedrooms"
            value={formData.bedrooms || ''}
            onChange={handleChange}
            required
            min="0"
            placeholder="3"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="bathrooms">Bathrooms *</label>
          <input
            type="number"
            id="bathrooms"
            name="bathrooms"
            value={formData.bathrooms || ''}
            onChange={handleChange}
            required
            min="0"
            step="0.5"
            placeholder="2"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="yearBuilt">Year Built (Optional)</label>
          <input
            type="number"
            id="yearBuilt"
            name="yearBuilt"
            value={formData.yearBuilt || ''}
            onChange={handleChange}
            min="1800"
            max={new Date().getFullYear()}
            placeholder="2000"
          />
        </div>
      </div>

      <button
        type="submit"
        className={styles.submitButton}
        disabled={loading}
      >
        {loading ? 'Calculating...' : 'Get Estimate'}
      </button>
    </form>
  );
}
