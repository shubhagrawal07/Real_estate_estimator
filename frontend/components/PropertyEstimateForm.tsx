'use client';

import { useState } from 'react';
import styles from './PropertyEstimateForm.module.css';

export enum PropertyType {
  APARTMENT = 'Apartment',
  HOUSE = 'House',
}

export enum OwnershipType {
  OWNER = 'Owner',
  TENANT = 'tenant',
}

export enum Deadline {
  IMMEDIATE = 'immediate',
  NOT_IMMEDIATE = 'not immediate',
}

interface PropertyData {
  // Step 1: Address and Postcode
  address: string;
  postalCode: number;
  
  // Step 2: Location Data
  department: string;
  municipality: string;
  cadastralSection: string;
  
  // Step 3: Features Data
  type: PropertyType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  hasBalcony: boolean;
  hasParking: boolean;
  ownershipType: OwnershipType;
  deadline: Deadline;
  condition?: string;
}

interface PropertyEstimateFormProps {
  onSubmit: (data: PropertyData) => void;
  loading: boolean;
}

export default function PropertyEstimateForm({
  onSubmit,
  loading,
}: PropertyEstimateFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyData>({
    address: '',
    postalCode: 0,
    department: '',
    municipality: '',
    cadastralSection: '',
    type: PropertyType.APARTMENT,
    area: 0,
    bedrooms: 1,
    bathrooms: 1,
    floors: 1,
    hasBalcony: false,
    hasParking: false,
    ownershipType: OwnershipType.OWNER,
    deadline: Deadline.NOT_IMMEDIATE,
    condition: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? value === '' ? 0 : Number(value)
          : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNext = () => {
    const validationErrors = validateStep(currentStep);
    if (Object.keys(validationErrors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    } else {
      setErrors(validationErrors);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    // Clear errors when going back
    setErrors({});
  };

  const validateStep = (step: number): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.address.trim()) {
          newErrors.address = 'Street address is required';
        }
        if (!formData.postalCode || formData.postalCode <= 0) {
          newErrors.postalCode = 'Postal code is required and must be greater than 0';
        } else if (formData.postalCode < 1000 || formData.postalCode > 99999) {
          newErrors.postalCode = 'Postal code must be between 1000 and 99999';
        }
        break;
      case 2:
        if (!formData.department.trim()) {
          newErrors.department = 'Department is required';
        }
        if (!formData.municipality.trim()) {
          newErrors.municipality = 'Municipality is required';
        }
        if (!formData.cadastralSection.trim()) {
          newErrors.cadastralSection = 'Cadastral section is required';
        }
        break;
      case 3:
        if (!formData.area || formData.area <= 0) {
          newErrors.area = 'Area is required and must be greater than 0';
        }
        if (!formData.bedrooms || formData.bedrooms < 1) {
          newErrors.bedrooms = 'Bedrooms is required and must be at least 1';
        }
        if (!formData.bathrooms || formData.bathrooms < 1) {
          newErrors.bathrooms = 'Bathrooms is required and must be at least 1';
        }
        if (!formData.floors || formData.floors < 1) {
          newErrors.floors = 'Floors is required and must be at least 1';
        }
        break;
      default:
        break;
    }

    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateStep(3);
    if (Object.keys(validationErrors).length === 0) {
      // Only include condition if it has a value
      const submitData = { ...formData };
      if (!submitData.condition || submitData.condition.trim() === '') {
        delete submitData.condition;
      }
      onSubmit(submitData);
    } else {
      setErrors(validationErrors);
    }
  };

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Address Information</h2>
      <p className={styles.stepDescription}>
        Please provide the property address and postal code
      </p>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="address" className={errors.address ? styles.errorLabel : ''}>
            Street Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="123 Main Street"
            className={errors.address ? styles.errorInput : ''}
          />
          {errors.address && (
            <span className={styles.errorMessage}>{errors.address}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="postalCode" className={errors.postalCode ? styles.errorLabel : ''}>
            Postal Code *
          </label>
          <input
            type="number"
            id="postalCode"
            name="postalCode"
            value={formData.postalCode || ''}
            onChange={handleChange}
            required
            min="1000"
            max="99999"
            placeholder="75001"
            className={errors.postalCode ? styles.errorInput : ''}
          />
          {errors.postalCode && (
            <span className={styles.errorMessage}>{errors.postalCode}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Location Data</h2>
      <p className={styles.stepDescription}>
        Please provide the location details of the property
      </p>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="department" className={errors.department ? styles.errorLabel : ''}>
            Department *
          </label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            placeholder="Paris"
            className={errors.department ? styles.errorInput : ''}
          />
          {errors.department && (
            <span className={styles.errorMessage}>{errors.department}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="municipality" className={errors.municipality ? styles.errorLabel : ''}>
            Municipality *
          </label>
          <input
            type="text"
            id="municipality"
            name="municipality"
            value={formData.municipality}
            onChange={handleChange}
            required
            placeholder="Paris"
            className={errors.municipality ? styles.errorInput : ''}
          />
          {errors.municipality && (
            <span className={styles.errorMessage}>{errors.municipality}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cadastralSection" className={errors.cadastralSection ? styles.errorLabel : ''}>
            Cadastral Section *
          </label>
          <input
            type="text"
            id="cadastralSection"
            name="cadastralSection"
            value={formData.cadastralSection}
            onChange={handleChange}
            required
            placeholder="Section A"
            className={errors.cadastralSection ? styles.errorInput : ''}
          />
          {errors.cadastralSection && (
            <span className={styles.errorMessage}>{errors.cadastralSection}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Property Features</h2>
      <p className={styles.stepDescription}>
        Please provide details about the property features
      </p>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="type">Property Type *</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value={PropertyType.APARTMENT}>Apartment</option>
            <option value={PropertyType.HOUSE}>House</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="area" className={errors.area ? styles.errorLabel : ''}>
            Area (m²) *
          </label>
          <input
            type="number"
            id="area"
            name="area"
            value={formData.area || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="100"
            className={errors.area ? styles.errorInput : ''}
          />
          {errors.area && (
            <span className={styles.errorMessage}>{errors.area}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="bedrooms" className={errors.bedrooms ? styles.errorLabel : ''}>
            Bedrooms *
          </label>
          <input
            type="number"
            id="bedrooms"
            name="bedrooms"
            value={formData.bedrooms || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="3"
            className={errors.bedrooms ? styles.errorInput : ''}
          />
          {errors.bedrooms && (
            <span className={styles.errorMessage}>{errors.bedrooms}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="bathrooms" className={errors.bathrooms ? styles.errorLabel : ''}>
            Bathrooms *
          </label>
          <input
            type="number"
            id="bathrooms"
            name="bathrooms"
            value={formData.bathrooms || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="2"
            className={errors.bathrooms ? styles.errorInput : ''}
          />
          {errors.bathrooms && (
            <span className={styles.errorMessage}>{errors.bathrooms}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="floors" className={errors.floors ? styles.errorLabel : ''}>
            Floors *
          </label>
          <input
            type="number"
            id="floors"
            name="floors"
            value={formData.floors || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="1"
            className={errors.floors ? styles.errorInput : ''}
          />
          {errors.floors && (
            <span className={styles.errorMessage}>{errors.floors}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="condition">Condition (Optional)</label>
          <select
            id="condition"
            name="condition"
            value={formData.condition || ''}
            onChange={handleChange}
          >
            <option value="">Select condition</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="needs renovation">Needs Renovation</option>
          </select>
        </div>

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="hasBalcony"
              checked={formData.hasBalcony}
              onChange={handleChange}
            />
            <span>Has Balcony</span>
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="hasParking"
              checked={formData.hasParking}
              onChange={handleChange}
            />
            <span>Has Parking</span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="ownershipType">Ownership Type *</label>
          <select
            id="ownershipType"
            name="ownershipType"
            value={formData.ownershipType}
            onChange={handleChange}
            required
          >
            <option value={OwnershipType.OWNER}>Owner</option>
            <option value={OwnershipType.TENANT}>Tenant</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="deadline">Deadline *</label>
          <select
            id="deadline"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            required
          >
            <option value={Deadline.IMMEDIATE}>Immediate</option>
            <option value={Deadline.NOT_IMMEDIATE}>Not Immediate</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Step Indicator */}
      <div className={styles.stepIndicator}>
        <div className={styles.stepIndicatorContainer}>
          {[1, 2, 3].map((step) => (
            <div key={step} className={styles.stepIndicatorItem}>
              <div
                className={`${styles.stepCircle} ${
                  currentStep >= step ? styles.active : ''
                }`}
              >
                {step}
              </div>
              <div className={styles.stepLabel}>
                {step === 1 && 'Address'}
                {step === 2 && 'Location'}
                {step === 3 && 'Features'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Navigation Buttons */}
      <div className={styles.buttonGroup}>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handlePrevious}
            className={styles.previousButton}
            disabled={loading}
          >
            Previous
          </button>
        )}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className={styles.nextButton}
            disabled={loading}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Calculating...' : 'Get Estimate'}
          </button>
        )}
      </div>
    </form>
  );
}
