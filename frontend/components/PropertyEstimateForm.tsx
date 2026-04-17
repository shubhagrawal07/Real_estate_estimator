'use client';

import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useGeocoding, type AddressSuggestion } from '@/hooks/useGeocoding';
import { ProgressStepHeader } from './estimate-form/ProgressStepHeader';
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

type BuildingAge = 'recent' | 'old';
type OutdoorSpace = 'none' | 'lt10' | 'gte10';
type PoolOption = 'pool' | 'possible' | 'not_possible';
type ConditionValue = 'excellent' | 'good' | 'needs renovation';

export interface PropertyData {
  // Required fields
  address: string;
  locationCode: string; // Format: {code_insee}{padding}{cadastral_section} e.g., "83137000BY"
  longitude?: number;
  latitude?: number;

  // Page 1
  type: PropertyType;
  buildingAge: BuildingAge;
  condition: ConditionValue;

  // Page 2
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  doubleLivingRoom: boolean;
  openKitchen: boolean;
  laundryCellar: boolean;

  apartmentElevator: boolean | null;
  apartmentFloor: number | null;
  outdoorSpace: OutdoorSpace;

  landSize: number | null;
  /** 0 = fully detached, 1 = semi-detached (1 connected wall), 2 = attached (2 connected walls) */
  sharedWalls: 0 | 1 | 2 | null;
  poolOption: PoolOption;

  // Page 3
  criteriaCalm: boolean;
  criteriaBright: boolean;
  criteriaNearAmenities: boolean;
  criteriaNoVisAvis: boolean;
  criteriaWellConnected: boolean;

  amenityAirConditioning: boolean;
  amenityModernBathroom: boolean;
  amenityRecentKitchen: boolean;
  amenityFireplace: boolean;
  amenityElectricityStandard: boolean;
  amenityDoubleTripleGlazing: boolean;

  parkingGarage: boolean;
  parkingPrivate: boolean;
  parkingShared: boolean;
  parkingStreet: boolean;

  // Backend fields
  hasBalcony: boolean;
  hasParking: boolean;
  ownershipType: OwnershipType;
  deadline: Deadline;
}

interface PropertyEstimateFormProps {
  onSubmit: (data: PropertyData) => void;
  loading: boolean;
}

const MIN_AREA = 0;
const MAX_AREA = 500;
const MIN_LAND_SIZE = 0;
const MAX_LAND_SIZE = 5000;

export default function PropertyEstimateForm({
  onSubmit,
  loading,
}: PropertyEstimateFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const isSelectingAddressRef = useRef(false);
  const { suggestions, loading: geocodingLoading, searchAddresses, selectAddress, clearSuggestions } = useGeocoding();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressInputValue, setAddressInputValue] = useState('');

  const [formData, setFormData] = useState<PropertyData>({
    address: '',
    locationCode: '0000000000', // Default: 5 zeros for code_insee + 000 padding + 00 for cadastral section
    longitude: undefined,
    latitude: undefined,
    type: PropertyType.APARTMENT,
    buildingAge: 'recent',
    condition: 'excellent',
    area: 70,
    bedrooms: 1,
    bathrooms: 1,
    floors: 1,
    doubleLivingRoom: false,
    openKitchen: false,
    laundryCellar: false,
    apartmentElevator: false,
    apartmentFloor: 1,
    outdoorSpace: 'none',
    landSize: 200,
    sharedWalls: 0,
    poolOption: 'not_possible',
    criteriaCalm: false,
    criteriaBright: false,
    criteriaNearAmenities: false,
    criteriaNoVisAvis: false,
    criteriaWellConnected: false,
    amenityAirConditioning: false,
    amenityModernBathroom: false,
    amenityRecentKitchen: false,
    amenityFireplace: false,
    amenityElectricityStandard: false,
    amenityDoubleTripleGlazing: false,
    parkingGarage: false,
    parkingPrivate: false,
    parkingShared: false,
    parkingStreet: false,
    hasBalcony: false,
    hasParking: false,
    ownershipType: OwnershipType.OWNER,
    deadline: Deadline.NOT_IMMEDIATE,
  });

  const setField = <K extends keyof PropertyData>(key: K, value: PropertyData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Handle address input change with debouncing
  useEffect(() => {
    // Don't show suggestions if we're in the process of selecting an address
    if (isSelectingAddressRef.current) {
      isSelectingAddressRef.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (addressInputValue && addressInputValue.length >= 3) {
        searchAddresses(addressInputValue);
        setShowSuggestions(true);
      } else {
        clearSuggestions();
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [addressInputValue, searchAddresses, clearSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addressInputRef.current &&
        !addressInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    try {
      // Set flag to prevent useEffect from reopening suggestions
      isSelectingAddressRef.current = true;
      
      const geocodingResult = await selectAddress(suggestion);
      
      setField('address', geocodingResult.address);
      
      // Set locationCode from geocoding result
      if (geocodingResult.locationCode) {
        setField('locationCode', geocodingResult.locationCode);
      } else {
        // Fallback: construct locationCode from available data
        const codeInsee = geocodingResult.citycode?.padStart(5, '0') || '00000';
        const padding = '000';
        const cadastralSection = geocodingResult.cadastralSection?.toUpperCase().padEnd(2, '0').substring(0, 2) || '00';
        setField('locationCode', `${codeInsee}${padding}${cadastralSection}`);
      }

      // Set longitude and latitude from geocoding result
      if (geocodingResult.coordinates) {
        setField('longitude', geocodingResult.coordinates.lon);
        setField('latitude', geocodingResult.coordinates.lat);
      }

      setAddressInputValue(geocodingResult.address);
      setShowSuggestions(false);
      clearSuggestions();
    } catch (error) {
      console.error('Error selecting address:', error);
      // Keep the input value even if geocoding fails
      setAddressInputValue(formData.address);
      isSelectingAddressRef.current = false;
    }
  };

  // Sync addressInputValue with formData.address
  useEffect(() => {
    if (!formData.address) {
      setAddressInputValue('');
    }
  }, [formData.address]);

  type ToggleKey =
    | 'doubleLivingRoom'
    | 'openKitchen'
    | 'laundryCellar'
    | 'criteriaCalm'
    | 'criteriaBright'
    | 'criteriaNearAmenities'
    | 'criteriaNoVisAvis'
    | 'criteriaWellConnected'
    | 'amenityAirConditioning'
    | 'amenityModernBathroom'
    | 'amenityRecentKitchen'
    | 'amenityFireplace'
    | 'amenityElectricityStandard'
    | 'amenityDoubleTripleGlazing'
    | 'parkingGarage'
    | 'parkingPrivate'
    | 'parkingShared'
    | 'parkingStreet';

  const toggleField = (key: ToggleKey) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isApartment = formData.type === PropertyType.APARTMENT;
  const stepLabels = ['Property basics', 'Size & layout', 'Quality & comfort'];
  const progressPercent = (currentStep / 3) * 100;

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log('Next clicked, currentStep:', currentStep);
    
    if (validateStep(currentStep)) {
      const nextStep = Math.min(currentStep + 1, 3);
      console.log('Moving to step:', nextStep);
      setCurrentStep(nextStep);
    } else {
      console.log('Validation failed for step:', currentStep);
    }
  };

  const handlePrevious = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleNumberInputWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      return Boolean(
        formData.address && 
        formData.address.trim().length > 0 &&
        formData.locationCode &&
        formData.locationCode.length === 10 &&
        formData.type && 
        formData.buildingAge && 
        formData.condition
      );
    }
    if (step === 2) {
      if (formData.area < 0 || formData.bedrooms < 0) {
        return false;
      }
      if (isApartment) {
        return (
          formData.apartmentElevator !== null &&
          formData.apartmentFloor !== null &&
          Boolean(formData.outdoorSpace)
        );
      }
      const landSize = formData.landSize;
      return (
        landSize !== null &&
        landSize >= 0 &&
        formData.sharedWalls !== null &&
        Boolean(formData.poolOption)
      );
    }
    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Form submit triggered, currentStep:', currentStep);
    
    if (currentStep < 3 || !validateStep(3)) {
      console.log('Form submission blocked - not on step 3 or validation failed');
      return;
    }
    const hasParking =
      formData.parkingGarage ||
      formData.parkingPrivate ||
      formData.parkingShared ||
      formData.parkingStreet;

    const hasBalcony = isApartment && formData.outdoorSpace !== 'none';
    const floors = isApartment && formData.apartmentFloor !== null ? formData.apartmentFloor : 1;

    const payload: PropertyData = {
      ...formData,
      hasBalcony,
      hasParking,
      floors,
      landSize: isApartment ? null : formData.landSize,
      apartmentElevator: isApartment ? formData.apartmentElevator : null,
      apartmentFloor: isApartment ? formData.apartmentFloor : null,
      outdoorSpace: isApartment ? formData.outdoorSpace : 'none',
      sharedWalls: isApartment ? null : formData.sharedWalls,
      poolOption: isApartment ? 'not_possible' : formData.poolOption,
    };

    onSubmit(payload);
  };

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Property basics</h2>
      <p className={styles.stepDescription}>Start with your property address.</p>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Property address</span>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={addressInputRef}
            type="text"
            value={addressInputValue}
            onChange={(e) => {
              setAddressInputValue(e.target.value);
              setField('address', e.target.value);
            }}
            onFocus={() => {
              // Only show suggestions when user actively focuses and types
              if (addressInputValue && addressInputValue.length >= 3) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Start typing address..."
            className={styles.addressInput}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className={styles.suggestionsDropdown}>
              {geocodingLoading && (
                <div className={styles.suggestionItem}>
                  <span>Searching...</span>
                </div>
              )}
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={styles.suggestionItem}
                  onClick={() => handleAddressSelect(suggestion)}
                >
                  <span className={styles.suggestionLabel}>{suggestion.label}</span>
                  {suggestion.properties.postcode && (
                    <span className={styles.suggestionPostcode}>
                      {suggestion.properties.postcode}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Property type</span>
        <div className={styles.optionGrid}>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.type === PropertyType.APARTMENT ? styles.optionSelected : ''
            }`}
            onClick={() => setField('type', PropertyType.APARTMENT)}
          >
            <span className={styles.buttonIcon}>🏢</span>
            <span>Apartment</span>
          </button>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.type === PropertyType.HOUSE ? styles.optionSelected : ''
            }`}
            onClick={() => setField('type', PropertyType.HOUSE)}
          >
            <span className={styles.buttonIcon}>🏡</span>
            <span>House</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Building age</span>
        <div className={styles.optionGrid}>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.buildingAge === 'recent' ? styles.optionSelected : ''
            }`}
            onClick={() => setField('buildingAge', 'recent')}
          >
            <span className={styles.buttonIcon}>🆕</span>
            <span>Recent (after 2010)</span>
          </button>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.buildingAge === 'old' ? styles.optionSelected : ''
            }`}
            onClick={() => setField('buildingAge', 'old')}
          >
            <span className={styles.buttonIcon}>🏛️</span>
            <span>Old (before 2010)</span>
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>General condition</span>
        <div className={styles.optionGrid}>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.condition === 'excellent' ? styles.optionSelected : ''
            }`}
            onClick={() => setField('condition', 'excellent')}
          >
            <span className={styles.buttonIcon}>✨</span>
            <span>Fully renovated</span>
          </button>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.condition === 'good' ? styles.optionSelected : ''
            }`}
            onClick={() => setField('condition', 'good')}
          >
            <span className={styles.buttonIcon}>🏠</span>
            <span>Minor works needed</span>
          </button>
          <button
            type="button"
            className={`${styles.optionButton} ${
              formData.condition === 'needs renovation' ? styles.optionSelected : ''
            }`}
            onClick={() => setField('condition', 'needs renovation')}
          >
            <span className={styles.buttonIcon}>🔨</span>
            <span>Full renovation needed</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const landSize = formData.landSize ?? 0;
    
    return (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Size & layout</h2>
      <p className={styles.stepDescription}>Slide or tap the buttons to adjust.</p>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Surface (m²)</span>
          <div className={styles.inlineValueInput}>
            <input
              type="number"
              min={MIN_AREA}
              max={MAX_AREA}
              value={formData.area}
              onWheel={handleNumberInputWheel}
              onFocus={(event) => {
                event.target.select();
              }}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!isNaN(value) && value >= 0 && value <= MAX_AREA) {
                  setField('area', Math.max(0, Math.round(value)));
                }
              }}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (!isNaN(value) && value >= 0 && value <= MAX_AREA) {
                  setField('area', Math.max(0, Math.round(value)));
                }
              }}
              className={styles.sliderInput}
            />
            <span className={styles.unitLabel}>m²</span>
          </div>
        </div>
        <div className={styles.sliderRow}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setField('area', Math.max(0, formData.area - 1))}
          >
            -
          </button>
          <input
            type="range"
            min={MIN_AREA}
            max={MAX_AREA}
            value={formData.area}
            onChange={(event) => setField('area', Number(event.target.value))}
            className={styles.slider}
          />
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setField('area', Math.min(MAX_AREA, formData.area + 1))}
          >
            +
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Bedrooms</span>
        <div className={styles.optionGrid}>
          {[0, 1, 2, 3, 4].map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.optionButton} ${
                formData.bedrooms === value ? styles.optionSelected : ''
              }`}
              onClick={() => setField('bedrooms', value)}
            >
              <span className={styles.buttonIcon}>🛏️</span>
              <span>{value === 4 ? '4+' : value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Quick features</span>
        <div className={styles.chipGroup}>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.doubleLivingRoom ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('doubleLivingRoom')}
          >
            <span className={styles.chipIcon}>🛋️</span>
            Double living room
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.openKitchen ? styles.chipSelected : ''}`}
            onClick={() => toggleField('openKitchen')}
          >
            <span className={styles.chipIcon}>🍳</span>
            Open kitchen
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.laundryCellar ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('laundryCellar')}
          >
            <span className={styles.chipIcon}>🧺</span>
            Laundry / cellar
          </button>
        </div>
      </div>

      {isApartment ? (
        <>
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Elevator</span>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.apartmentElevator === true ? styles.optionSelected : ''
                }`}
                onClick={() => setField('apartmentElevator', true)}
              >
                <span className={styles.buttonIcon}>✅</span>
                <span>Yes</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.apartmentElevator === false ? styles.optionSelected : ''
                }`}
                onClick={() => setField('apartmentElevator', false)}
              >
                <span className={styles.buttonIcon}>❌</span>
                <span>No</span>
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Floor</span>
            <div className={styles.optionGrid}>
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.optionButton} ${
                    formData.apartmentFloor === value ? styles.optionSelected : ''
                  }`}
                  onClick={() => setField('apartmentFloor', value)}
                >
                  <span className={styles.buttonIcon}>📶</span>
                  <span>{value === 5 ? '5+' : value}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Outdoor space</span>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.outdoorSpace === 'none' ? styles.optionSelected : ''
                }`}
                onClick={() => setField('outdoorSpace', 'none')}
              >
                <span className={styles.buttonIcon}>🚫</span>
                <span>None</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.outdoorSpace === 'lt10' ? styles.optionSelected : ''
                }`}
                onClick={() => setField('outdoorSpace', 'lt10')}
              >
                <span className={styles.buttonIcon}>🪴</span>
                <span>&lt; 10 m²</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.outdoorSpace === 'gte10' ? styles.optionSelected : ''
                }`}
                onClick={() => setField('outdoorSpace', 'gte10')}
              >
                <span className={styles.buttonIcon}>🌳</span>
                <span>10 m²+</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Land size (m²)</span>
              <div className={styles.inlineValueInput}>
                <input
                  type="number"
                  min={MIN_LAND_SIZE}
                  max={MAX_LAND_SIZE}
                  value={landSize}
                  onWheel={handleNumberInputWheel}
                  onFocus={(event) => {
                    event.target.select();
                  }}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!isNaN(value) && value >= 0 && value <= MAX_LAND_SIZE) {
                      setField('landSize', Math.max(0, Math.round(value)));
                    }
                  }}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (!isNaN(value) && value >= 0 && value <= MAX_LAND_SIZE) {
                      setField('landSize', Math.max(0, Math.round(value)));
                    }
                  }}
                  className={styles.sliderInput}
                />
                <span className={styles.unitLabel}>m²</span>
              </div>
            </div>
            <div className={styles.sliderRow}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setField('landSize', Math.max(0, landSize - 10))}
              >
                -
              </button>
              <input
                type="range"
                min={MIN_LAND_SIZE}
                max={MAX_LAND_SIZE}
                value={landSize}
                onChange={(event) => setField('landSize', Number(event.target.value))}
                className={styles.slider}
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setField('landSize', Math.min(MAX_LAND_SIZE, landSize + 10))}
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Structural type</span>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.sharedWalls === 0 ? styles.optionSelected : ''
                }`}
                onClick={() => setField('sharedWalls', 0)}
              >
                <span className={styles.buttonIcon}>🏡</span>
                <span>Fully detached</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.sharedWalls === 1 ? styles.optionSelected : ''
                }`}
                onClick={() => setField('sharedWalls', 1)}
              >
                <span className={styles.buttonIcon}>🏘️</span>
                <span>Semi detached (1 connected wall)</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.sharedWalls === 2 ? styles.optionSelected : ''
                }`}
                onClick={() => setField('sharedWalls', 2)}
              >
                <span className={styles.buttonIcon}>🏢</span>
                <span>Attached (2 connected walls)</span>
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Pool</span>
            <div className={styles.optionGrid}>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.poolOption === 'pool' ? styles.optionSelected : ''
                }`}
                onClick={() => setField('poolOption', 'pool')}
              >
                <span className={styles.buttonIcon}>🏊</span>
                <span>Pool</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.poolOption === 'possible' ? styles.optionSelected : ''
                }`}
                onClick={() => setField('poolOption', 'possible')}
              >
                <span className={styles.buttonIcon}>🚧</span>
                <span>Pool possible</span>
              </button>
              <button
                type="button"
                className={`${styles.optionButton} ${
                  formData.poolOption === 'not_possible' ? styles.optionSelected : ''
                }`}
                onClick={() => setField('poolOption', 'not_possible')}
              >
                <span className={styles.buttonIcon}>⛔</span>
                <span>Not possible</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    );
  };

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <h2 className={styles.stepTitle}>Quality & comfort</h2>
      <p className={styles.stepDescription}>Tap to select the highlights.</p>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Key criteria</span>
        <div className={styles.chipGroup}>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.criteriaCalm ? styles.chipSelected : ''}`}
            onClick={() => toggleField('criteriaCalm')}
          >
            <span className={styles.chipIcon}>🤫</span>
            Calm
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.criteriaBright ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('criteriaBright')}
          >
            <span className={styles.chipIcon}>☀️</span>
            Bright
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.criteriaNearAmenities ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('criteriaNearAmenities')}
          >
            <span className={styles.chipIcon}>🏪</span>
            Near amenities
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.criteriaNoVisAvis ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('criteriaNoVisAvis')}
          >
            <span className={styles.chipIcon}>🔒</span>
            No vis-à-vis
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.criteriaWellConnected ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('criteriaWellConnected')}
          >
            <span className={styles.chipIcon}>🚇</span>
            Well connected
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Amenities</span>
        <div className={styles.chipGroup}>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.amenityAirConditioning ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('amenityAirConditioning')}
          >
            <span className={styles.chipIcon}>❄️</span>
            Air conditioning
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.amenityModernBathroom ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('amenityModernBathroom')}
          >
            <span className={styles.chipIcon}>🛁</span>
            Modern bathroom
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.amenityRecentKitchen ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('amenityRecentKitchen')}
          >
            <span className={styles.chipIcon}>🍽️</span>
            Recent equipped kitchen
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.amenityFireplace ? styles.chipSelected : ''}`}
            onClick={() => toggleField('amenityFireplace')}
          >
            <span className={styles.chipIcon}>🔥</span>
            Fireplace or stove
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.amenityElectricityStandard ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('amenityElectricityStandard')}
          >
            <span className={styles.chipIcon}>⚡</span>
            Electricity up to standard
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${
              formData.amenityDoubleTripleGlazing ? styles.chipSelected : ''
            }`}
            onClick={() => toggleField('amenityDoubleTripleGlazing')}
          >
            <span className={styles.chipIcon}>🪟</span>
            Double / triple glazing
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Parking</span>
        <div className={styles.chipGroup}>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.parkingGarage ? styles.chipSelected : ''}`}
            onClick={() => toggleField('parkingGarage')}
          >
            <span className={styles.chipIcon}>🚗</span>
            Garage
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.parkingPrivate ? styles.chipSelected : ''}`}
            onClick={() => toggleField('parkingPrivate')}
          >
            <span className={styles.chipIcon}>🅿️</span>
            Private parking spot
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.parkingShared ? styles.chipSelected : ''}`}
            onClick={() => toggleField('parkingShared')}
          >
            <span className={styles.chipIcon}>🚙</span>
            Shared parking
          </button>
          <button
            type="button"
            className={`${styles.chipButton} ${formData.parkingStreet ? styles.chipSelected : ''}`}
            onClick={() => toggleField('parkingStreet')}
          >
            <span className={styles.chipIcon}>🛣️</span>
            Street parking
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <ProgressStepHeader
        currentStep={currentStep}
        totalSteps={3}
        stepLabels={stepLabels}
        progressPercent={progressPercent}
      />
      <div key={currentStep} className={styles.stepContainer}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      <div className={styles.stepActions}>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={(e) => handlePrevious(e)}
            className={styles.previousButton}
            disabled={loading}
          >
            Back
          </button>
        )}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={(e) => handleNext(e)}
            className={styles.nextButton}
            disabled={!validateStep(currentStep) || loading}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Calculating...' : 'Get estimate'}
          </button>
        )}
      </div>
    </form>
  );
}
