'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const MIN_BUDGET = 0;
const MAX_BUDGET = 2000000;
const BUDGET_STEP = 10000;

export default function BuyerSearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    propertyType: 'Apartment' as 'Apartment' | 'House',
    cityInseeCode: '',
    cadastralSection: '',
    budget: 0,
    bedrooms: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'cadastralSection' ? value.toUpperCase() : name === 'budget' ? Number(value) : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePropertyTypeChange = (type: 'Apartment' | 'House') => {
    setFormData((prev) => ({
      ...prev,
      propertyType: type,
    }));
    if (errors.propertyType) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.propertyType;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.propertyType) {
      newErrors.propertyType = 'Property type is required';
    }

    if (!formData.cityInseeCode) {
      newErrors.cityInseeCode = 'City INSEE code is required';
    } else if (!/^\d{5}$/.test(formData.cityInseeCode)) {
      newErrors.cityInseeCode = 'City INSEE code must be 5 digits';
    }

    if (!formData.cadastralSection) {
      newErrors.cadastralSection = 'Cadastral section is required';
    } else if (!/^[A-Z]{2}$/.test(formData.cadastralSection.toUpperCase())) {
      newErrors.cadastralSection = 'Cadastral section must be 2 alphabetic characters';
    }

    if (formData.budget === undefined || formData.budget < 0 || formData.budget > MAX_BUDGET) {
      newErrors.budget = `Budget must be between 0€ and ${MAX_BUDGET.toLocaleString()}€`;
    }

    if (formData.bedrooms === '') {
      newErrors.bedrooms = 'Number of bedrooms is required';
    } else {
      const bedroomsNum = Number(formData.bedrooms);
      if (!Number.isInteger(bedroomsNum) || bedroomsNum < 0) {
        newErrors.bedrooms = 'Number of bedrooms must be a non-negative integer';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      alert('Please log in to search for properties');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = (session as any).backendToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/buyer/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            propertyType: formData.propertyType,
            cityInseeCode: formData.cityInseeCode,
            cadastralSection: formData.cadastralSection.toUpperCase(),
            budget: formData.budget,
            bedrooms: Number(formData.bedrooms),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search properties');
      }

      const data = await response.json();
      
      // Store search results in sessionStorage and redirect to map page
      sessionStorage.setItem('buyerSearchResults', JSON.stringify(data.properties));
      sessionStorage.setItem('buyerSearchCriteria', JSON.stringify({
        propertyType: formData.propertyType,
        cityInseeCode: formData.cityInseeCode,
        cadastralSection: formData.cadastralSection.toUpperCase(),
        budget: Number(formData.budget),
        bedrooms: Number(formData.bedrooms),
      }));

      router.push('/buyerSearchResults');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to search properties');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.notLoggedIn}>
          <p>Please log in to search for properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Search Properties</h1>
        <p className={styles.subtitle}>Find properties that match your criteria</p>
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Property Type <span className={styles.required}>*</span>
            </span>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.propertyType === 'Apartment' ? styles.optionSelected : ''
                }`}
                onClick={() => handlePropertyTypeChange('Apartment')}
              >
                <span className={styles.buttonIcon}>🏢</span>
                <span>Apartment</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.propertyType === 'House' ? styles.optionSelected : ''
                }`}
                onClick={() => handlePropertyTypeChange('House')}
              >
                <span className={styles.buttonIcon}>🏡</span>
                <span>House</span>
              </button>
            </div>
            {errors.propertyType && (
              <span className={styles.errorText}>{errors.propertyType}</span>
            )}
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              City (INSEE Code) <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              id="cityInseeCode"
              name="cityInseeCode"
              value={formData.cityInseeCode}
              onChange={handleChange}
              placeholder="e.g., 83137"
              maxLength={5}
              className={`${styles.input} ${errors.cityInseeCode ? styles.error : ''}`}
            />
            {errors.cityInseeCode && (
              <span className={styles.errorText}>{errors.cityInseeCode}</span>
            )}
            <span className={styles.helpText}>5-digit INSEE code</span>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Cadastral Section <span className={styles.required}>*</span>
            </span>
            <input
              type="text"
              id="cadastralSection"
              name="cadastralSection"
              value={formData.cadastralSection}
              onChange={handleChange}
              placeholder="e.g., BY"
              maxLength={2}
              className={`${styles.input} ${errors.cadastralSection ? styles.error : ''}`}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.cadastralSection && (
              <span className={styles.errorText}>{errors.cadastralSection}</span>
            )}
            <span className={styles.helpText}>2 alphabetic characters (will be converted to uppercase)</span>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Budget (€) <span className={styles.required}>*</span>
            </span>
            <div className={styles.sliderRow}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setFormData((prev) => ({
                  ...prev,
                  budget: Math.max(MIN_BUDGET, prev.budget - BUDGET_STEP),
                }))}
              >
                -
              </button>
              <input
                type="range"
                id="budget"
                name="budget"
                min={MIN_BUDGET}
                max={MAX_BUDGET}
                step={BUDGET_STEP}
                value={formData.budget}
                onChange={handleChange}
                className={`${styles.slider} ${errors.budget ? styles.error : ''}`}
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setFormData((prev) => ({
                  ...prev,
                  budget: Math.min(MAX_BUDGET, prev.budget + BUDGET_STEP),
                }))}
              >
                +
              </button>
              <input
                type="number"
                min={MIN_BUDGET}
                max={MAX_BUDGET}
                step={BUDGET_STEP}
                value={formData.budget}
                onFocus={(event) => {
                  event.target.select();
                }}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!isNaN(value) && value >= 0 && value <= MAX_BUDGET) {
                    setFormData((prev) => ({
                      ...prev,
                      budget: Math.max(0, Math.round(value)),
                    }));
                  }
                }}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (!isNaN(value) && value >= 0 && value <= MAX_BUDGET) {
                    setFormData((prev) => ({
                      ...prev,
                      budget: Math.max(0, Math.round(value)),
                    }));
                  }
                }}
                className={`${styles.sliderInput} ${errors.budget ? styles.error : ''}`}
              />
              <span className={styles.unitLabel}>€</span>
            </div>
            {errors.budget && (
              <span className={styles.errorText}>{errors.budget}</span>
            )}
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>
              Number of Bedrooms <span className={styles.required}>*</span>
            </span>
            <input
              type="number"
              id="bedrooms"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleChange}
              placeholder="e.g., 3"
              min="0"
              step="1"
              className={`${styles.input} ${errors.bedrooms ? styles.error : ''}`}
            />
            {errors.bedrooms && (
              <span className={styles.errorText}>{errors.bedrooms}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Searching...' : 'Search Properties'}
          </button>
        </form>
      </div>
    </div>
  );
}

