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
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.address.trim() !== '' && formData.postalCode > 0;
      case 2:
        return (
          formData.department.trim() !== '' &&
          formData.municipality.trim() !== '' &&
          formData.cadastralSection.trim() !== ''
        );
      case 3:
        return (
          formData.area > 0 &&
          formData.bedrooms >= 1 &&
          formData.bathrooms >= 1 &&
          formData.floors >= 1
        );
      default:
        return true;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(3)) {
      // Only include condition if it has a value
      const submitData = { ...formData };
      if (!submitData.condition || submitData.condition.trim() === '') {
        delete submitData.condition;
      }
      onSubmit(submitData);
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
          <label htmlFor="address">Street Address *</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            placeholder="123 Main Street"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="postalCode">Postal Code *</label>
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
          />
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
          <label htmlFor="department">Department *</label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            placeholder="Paris"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="municipality">Municipality *</label>
          <input
            type="text"
            id="municipality"
            name="municipality"
            value={formData.municipality}
            onChange={handleChange}
            required
            placeholder="Paris"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cadastralSection">Cadastral Section *</label>
          <input
            type="text"
            id="cadastralSection"
            name="cadastralSection"
            value={formData.cadastralSection}
            onChange={handleChange}
            required
            placeholder="Section A"
          />
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
          <label htmlFor="area">Area (m²) *</label>
          <input
            type="number"
            id="area"
            name="area"
            value={formData.area || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="100"
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
            min="1"
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
            min="1"
            placeholder="2"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="floors">Floors *</label>
          <input
            type="number"
            id="floors"
            name="floors"
            value={formData.floors || ''}
            onChange={handleChange}
            required
            min="1"
            placeholder="1"
          />
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
          {[1, 2, 3, 4].map((step) => (
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
                {step === 4 && 'Submit'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Review & Submit</h2>
          <p className={styles.stepDescription}>
            Please review your information and submit to get your property estimate
          </p>
          <div className={styles.reviewSection}>
            <div className={styles.reviewItem}>
              <strong>Address:</strong> {formData.address}, {formData.postalCode}
            </div>
            <div className={styles.reviewItem}>
              <strong>Location:</strong> {formData.municipality}, {formData.department}
            </div>
            <div className={styles.reviewItem}>
              <strong>Type:</strong> {formData.type}
            </div>
            <div className={styles.reviewItem}>
              <strong>Area:</strong> {formData.area} m²
            </div>
            <div className={styles.reviewItem}>
              <strong>Bedrooms:</strong> {formData.bedrooms} | <strong>Bathrooms:</strong> {formData.bathrooms} | <strong>Floors:</strong> {formData.floors}
            </div>
            <div className={styles.reviewItem}>
              <strong>Features:</strong> {formData.hasBalcony && 'Balcony '} {formData.hasParking && 'Parking'}
            </div>
          </div>
        </div>
      )}

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
        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className={styles.nextButton}
            disabled={!validateStep(currentStep) || loading}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !validateStep(3)}
          >
            {loading ? 'Calculating...' : 'Get Estimate'}
          </button>
        )}
      </div>
    </form>
  );
}
