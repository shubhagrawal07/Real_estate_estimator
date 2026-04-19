'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { consumeBuyerToastFlag } from '@/components/intent/intentSession';
import { DEFAULT_CITY_CODE_INSEE, VAR_CITIES_NEAR_TOULON } from '@/constants/varCitiesNearToulon';
import { buyerSearchService } from '@/services/buyer-search.service';
import styles from './page.module.css';

const MIN_BUDGET = 0;
const MAX_BUDGET = 2000000;
const BUDGET_STEP = 10000;
const MIN_AREA = 0;
const MAX_AREA = 500;
const MIN_LAND_AREA = 0;
const MAX_LAND_AREA = 5000;

export default function BuyerSearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    propertyType: 'Apartment' as 'Apartment' | 'House',
    cityInseeCode: DEFAULT_CITY_CODE_INSEE,
    budget: 0,
    bedrooms: '',
    minSurfaceArea: 0,
    pool: false,
    minLandArea: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buyerExploreToast, setBuyerExploreToast] = useState(false);

  useEffect(() => {
    if (!consumeBuyerToastFlag()) return;
    const show = window.setTimeout(() => setBuyerExploreToast(true), 1000);
    const hide = window.setTimeout(() => setBuyerExploreToast(false), 5000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'budget' || name === 'minSurfaceArea' || name === 'minLandArea'
          ? (value === '' ? 0 : Number(value))
          : name === 'pool'
            ? (e.target as HTMLInputElement).checked
            : value,
    }));
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

  const handleNumberInputWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.propertyType) {
      newErrors.propertyType = 'Property type is required';
    }

    if (!formData.cityInseeCode || !/^\d{5}$/.test(formData.cityInseeCode)) {
      newErrors.cityInseeCode = 'Please select a city';
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

    if (
      formData.minSurfaceArea !== undefined &&
      (formData.minSurfaceArea < MIN_AREA || formData.minSurfaceArea > MAX_AREA)
    ) {
      newErrors.minSurfaceArea = `Minimum surface area must be between ${MIN_AREA} and ${MAX_AREA} m²`;
    }

    if (
      formData.propertyType === 'House' &&
      formData.minLandArea !== undefined &&
      (formData.minLandArea < MIN_LAND_AREA || formData.minLandArea > MAX_LAND_AREA)
    ) {
      newErrors.minLandArea = `Minimum land area must be between ${MIN_LAND_AREA} and ${MAX_LAND_AREA} m²`;
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

    const token = session?.backendToken;
    if (!token) return;
    try {
      const cityLabel = VAR_CITIES_NEAR_TOULON.find(
        (c) => c.codeInsee === formData.cityInseeCode
      )?.label;

      const payload = {
        propertyType: formData.propertyType,
        cityInseeCode: formData.cityInseeCode,
        budget: formData.budget,
        bedrooms: Number(formData.bedrooms),
        minSurfaceArea: formData.minSurfaceArea ?? 0,
        pool: formData.propertyType === 'House' ? formData.pool : undefined,
        minLandArea:
          formData.propertyType === 'House' && (formData.minLandArea ?? 0) > 0
            ? formData.minLandArea
            : undefined,
      };
      const data = await buyerSearchService.search(payload, token);
      sessionStorage.setItem('buyerSearchResults', JSON.stringify(data.properties));
      sessionStorage.setItem('buyerSearchCriteria', JSON.stringify({
        ...payload,
        ...(cityLabel !== undefined ? { cityLabel } : {}),
        minSurfaceArea: formData.minSurfaceArea ?? 0,
        pool: formData.pool,
        minLandArea: formData.minLandArea ?? 0,
      }));
      router.push('/buyerSearchResults');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to search properties');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toastEl = buyerExploreToast ? (
    <div className={styles.intentToast} role="status">
      Explore available properties in your area.
    </div>
  ) : null;

  if (!session) {
    return (
      <div className={styles.container}>
        {toastEl}
        <div className={styles.notLoggedIn}>
          <p>Please log in to search for properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {toastEl}
      <div className={styles.header}>
        <h1 className={styles.title}>Search Properties</h1>
        <p className={styles.subtitle}>Find properties that match your criteria</p>
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <label htmlFor="cityInseeCode" className={styles.sectionTitle}>
              City <span className={styles.required}>*</span>
            </label>
            <select
              id="cityInseeCode"
              name="cityInseeCode"
              value={formData.cityInseeCode}
              onChange={handleChange}
              className={`${styles.input} ${errors.cityInseeCode ? styles.error : ''}`}
              aria-invalid={Boolean(errors.cityInseeCode)}
            >
              {VAR_CITIES_NEAR_TOULON.map((city) => (
                <option key={city.codeInsee} value={city.codeInsee}>
                  {city.label}
                </option>
              ))}
            </select>
            {errors.cityInseeCode && (
              <span className={styles.errorText}>{errors.cityInseeCode}</span>
            )}
          </div>

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
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                Budget (€) <span className={styles.required}>*</span>
              </span>
              <div className={styles.inlineValueInput}>
                <input
                  type="number"
                  min={MIN_BUDGET}
                  max={MAX_BUDGET}
                  step={BUDGET_STEP}
                  value={formData.budget}
                  onWheel={handleNumberInputWheel}
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
            </div>
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
              onWheel={handleNumberInputWheel}
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

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Minimum surface area (m²)</span>
            <input
              type="number"
              id="minSurfaceArea"
              name="minSurfaceArea"
              value={formData.minSurfaceArea === 0 ? '' : formData.minSurfaceArea}
              onWheel={handleNumberInputWheel}
              onChange={handleChange}
              placeholder="e.g., 70"
              min={MIN_AREA}
              max={MAX_AREA}
              step="5"
              className={`${styles.input} ${errors.minSurfaceArea ? styles.error : ''}`}
            />
            {errors.minSurfaceArea && (
              <span className={styles.errorText}>{errors.minSurfaceArea}</span>
            )}
            <span className={styles.helpText}>Optional. Leave empty or 0 for no minimum.</span>
          </div>

          {formData.propertyType === 'House' && (
            <>
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Pool</span>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="pool"
                    checked={formData.pool}
                    onChange={handleChange}
                  />
                  <span>I want a property with a pool (or pool possible)</span>
                </label>
              </div>
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Minimum land area (m²)</span>
                <input
                  type="number"
                  id="minLandArea"
                  name="minLandArea"
                  value={formData.minLandArea === 0 ? '' : formData.minLandArea}
                  onWheel={handleNumberInputWheel}
                  onChange={handleChange}
                  placeholder="e.g., 500"
                  min={MIN_LAND_AREA}
                  max={MAX_LAND_AREA}
                  step="50"
                  className={`${styles.input} ${errors.minLandArea ? styles.error : ''}`}
                />
                {errors.minLandArea && (
                  <span className={styles.errorText}>{errors.minLandArea}</span>
                )}
                <span className={styles.helpText}>Optional. Leave empty or 0 for no minimum.</span>
              </div>
            </>
          )}

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

