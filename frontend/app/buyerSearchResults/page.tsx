'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './page.module.css';

const PROPERTIES_SOURCE_ID = 'properties';
const PROPERTIES_LAYER_ID = 'properties-pins';

// Pin size: double size, constant when zoomed out, grows to 3x at max zoom
const PIN_SIZE_ZOOMED_OUT = 1;
const PIN_SIZE_MAX_ZOOM = 3;
const pinSizeByZoom: [number, number][] = [
  [0, PIN_SIZE_ZOOMED_OUT],
  [8, PIN_SIZE_ZOOMED_OUT],
  [12, (PIN_SIZE_ZOOMED_OUT + PIN_SIZE_MAX_ZOOM) * 0.5],
  [16, PIN_SIZE_ZOOMED_OUT + (PIN_SIZE_MAX_ZOOM - PIN_SIZE_ZOOMED_OUT) * 0.75],
  [20, PIN_SIZE_MAX_ZOOM],
];

const PIN_IMAGE_WIDTH = 24;
const PIN_IMAGE_HEIGHT = 36;

function getPinSvgHex(fillHex: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PIN_IMAGE_WIDTH} ${PIN_IMAGE_HEIGHT}" width="${PIN_IMAGE_WIDTH}" height="${PIN_IMAGE_HEIGHT}">
  <circle cx="12" cy="10" r="7" fill="${fillHex}" stroke="#fff" stroke-width="2.5"/>
  <path d="M5 17 L12 35 L19 17 Z" fill="${fillHex}" stroke="#fff" stroke-width="2.5"/>
  <circle cx="12" cy="10" r="3" fill="#fff"/>
</svg>`;
}

function loadImageAsPromise(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface RankedProperty {
  propertyId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  type: string;
  area: number;
  bedrooms: number;
  rankScore: number;
  budgetScore: number;
  bedroomScore: number;
}

function buildPropertiesGeoJSON(properties: RankedProperty[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point, { propertyId: string }>[] = properties
    .filter(
      (p: RankedProperty) =>
        p.latitude != null &&
        p.longitude != null &&
        !isNaN(Number(p.latitude)) &&
        !isNaN(Number(p.longitude)) &&
        isFinite(Number(p.latitude)) &&
        isFinite(Number(p.longitude))
    )
    .map((p: RankedProperty) => ({
      type: 'Feature' as const,
      id: p.propertyId,
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(p.longitude), Number(p.latitude)],
      },
      properties: { propertyId: p.propertyId },
    }));
  return { type: 'FeatureCollection', features };
}

export default function BuyerSearchResultsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [properties, setProperties] = useState<RankedProperty[]>([]);
  const [searchCriteria, setSearchCriteria] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [updatingFavourites, setUpdatingFavourites] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load search results from sessionStorage
    const storedResults = sessionStorage.getItem('buyerSearchResults');
    const storedCriteria = sessionStorage.getItem('buyerSearchCriteria');

    if (!storedResults) {
      setError('No search results found. Please perform a search first.');
      setLoading(false);
      return;
    }

    try {
      const results = JSON.parse(storedResults);
      const criteria = storedCriteria ? JSON.parse(storedCriteria) : null;
      setProperties(results);
      setSearchCriteria(criteria);
      setLoading(false);
      
      // Load favorite status for all properties
      if (session && (session as any).backendToken && results.length > 0) {
        loadFavourites(results.map((p: RankedProperty) => p.propertyId));
      }
    } catch (err) {
      setError('Failed to load search results');
      setLoading(false);
    }
  }, [session]);

  const loadFavourites = async (propertyIds: string[]) => {
    if (!session || !(session as any).backendToken) return;

    try {
      const token = (session as any).backendToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/favourite-property/batch/check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ propertyIds }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFavourites(data.favourites || {});
      }
    } catch (err) {
      console.error('Failed to load favourites:', err);
    }
  };

  const toggleFavourite = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering property click

    if (!session || !(session as any).backendToken) {
      alert('Please log in to save favorites');
      return;
    }

    setUpdatingFavourites((prev) => ({ ...prev, [propertyId]: true }));

    try {
      const token = (session as any).backendToken;
      const isCurrentlyFavourite = favourites[propertyId];

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/favourite-property/${propertyId}`,
        {
          method: isCurrentlyFavourite ? 'DELETE' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setFavourites((prev) => ({
          ...prev,
          [propertyId]: !isCurrentlyFavourite,
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update favorite');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update favorite');
    } finally {
      setUpdatingFavourites((prev) => {
        const newState = { ...prev };
        delete newState[propertyId];
        return newState;
      });
    }
  };

  useEffect(() => {
    if (properties.length > 0 && mapContainer.current && !map.current) {
      initializeMap();
    }

    return () => {
      if (popup.current) {
        popup.current.remove();
        popup.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [properties]);

  // Update pin icon (default vs selected) when selection changes
  useEffect(() => {
    if (!map.current || !map.current.getLayer(PROPERTIES_LAYER_ID)) return;
    const selected = selectedPropertyId ?? '';
    map.current.setLayoutProperty(PROPERTIES_LAYER_ID, 'icon-image', [
      'case',
      ['==', ['get', 'propertyId'], selected],
      'pin-selected',
      'pin',
    ]);
  }, [selectedPropertyId, mapLoaded]);

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXV4NTFmZmYzMnAydGJ1b3V6YjMifQ.rJcFIG214AriISLbB6B5aw';
    
    mapboxgl.accessToken = mapboxToken;

    const center = calculateMapCenter();
    
    if (!center || center.length !== 2 || isNaN(center[0]) || isNaN(center[1]) || !isFinite(center[0]) || !isFinite(center[1])) {
      console.error('Invalid center coordinates:', center);
      return;
    }
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center as [number, number],
      zoom: properties.length === 1 ? 15 : 12,
      renderWorldCopies: false,
    });

    map.current.on('load', async () => {
      const m = map.current!;
      const geojson = buildPropertiesGeoJSON(properties);
      m.addSource(PROPERTIES_SOURCE_ID, { type: 'geojson', data: geojson });

      const pinSvg = getPinSvgHex('#667eea');
      const pinSelectedSvg = getPinSvgHex('#5568d3');
      const dataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
      const [imgPin, imgPinSelected] = await Promise.all([
        loadImageAsPromise(dataUri(pinSvg)),
        loadImageAsPromise(dataUri(pinSelectedSvg)),
      ]);
      m.addImage('pin', imgPin, { pixelRatio: 2 });
      m.addImage('pin-selected', imgPinSelected, { pixelRatio: 2 });

      const iconSizeExpr: mapboxgl.Expression = [
        'interpolate',
        ['linear'],
        ['zoom'],
        ...pinSizeByZoom.flat(),
      ];
      m.addLayer({
        id: PROPERTIES_LAYER_ID,
        type: 'symbol',
        source: PROPERTIES_SOURCE_ID,
        layout: {
          'icon-image': 'pin',
          'icon-size': iconSizeExpr,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
      });

      popup.current = new mapboxgl.Popup({ offset: [0, -35], closeOnClick: false });
      m.on('click', PROPERTIES_LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const propertyId = f.properties?.propertyId as string | undefined;
        if (!propertyId) return;
        const property = properties.find((p) => p.propertyId === propertyId);
        if (!property) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        if (!coords || coords.length < 2) return;
        setSelectedPropertyId(propertyId);
        popup.current?.setLngLat(coords).setHTML(createPopupHTML(property)).addTo(m);
        m.flyTo({ center: coords, zoom: 15, duration: 1000 });
      });
      m.on('mouseenter', PROPERTIES_LAYER_ID, () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', PROPERTIES_LAYER_ID, () => (m.getCanvas().style.cursor = ''));
      setMapLoaded(true);
    });
  };

  const calculateMapCenter = (): [number, number] => {
    if (properties.length === 0) {
      return [2.3522, 48.8566]; // Default center (France)
    }

    const validProps = properties.filter(
      p => 
        p.latitude != null && 
        p.longitude != null && 
        !isNaN(p.latitude) && 
        !isNaN(p.longitude) &&
        isFinite(p.latitude) &&
        isFinite(p.longitude)
    );
    
    if (validProps.length === 0) {
      return [2.3522, 48.8566];
    }

    const avgLng = validProps.reduce((sum, p) => sum + Number(p.longitude), 0) / validProps.length;
    const avgLat = validProps.reduce((sum, p) => sum + Number(p.latitude), 0) / validProps.length;

    if (isNaN(avgLng) || isNaN(avgLat) || !isFinite(avgLng) || !isFinite(avgLat)) {
      return [2.3522, 48.8566];
    }

    return [avgLng, avgLat];
  };

  const createPopupHTML = (property: RankedProperty): string => {
    const price = property.estimatedPrice
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(property.estimatedPrice)
      : 'N/A';

    return `
      <div style="padding: 0.5rem; min-width: 200px;">
        <h3 style="font-size: 1rem; font-weight: 600; color: #333; margin: 0 0 0.5rem 0; line-height: 1.4;">${property.address}</h3>
        <div style="font-size: 1.25rem; font-weight: 700; color: #667eea; margin-bottom: 0.5rem;">${price}</div>
        <div style="display: flex; gap: 0.5rem; font-size: 0.875rem; color: #666; flex-wrap: wrap; margin-bottom: 0.5rem;">
          <span>${property.type}</span>
          <span>•</span>
          <span>${property.area} m²</span>
          ${property.bedrooms > 0 ? `<span>•</span><span>${property.bedrooms} bed</span>` : ''}
        </div>
        <div style="font-size: 0.75rem; color: #999; margin-top: 0.5rem;">
          Match Score: <strong>${property.rankScore.toFixed(1)}/100</strong> (Budget: ${property.budgetScore.toFixed(1)}/70, Bedrooms: ${property.bedroomScore.toFixed(1)}/30)
        </div>
      </div>
    `;
  };

  const handlePropertyClick = (property: RankedProperty) => {
    setSelectedPropertyId(property.propertyId);
    const lat = Number(property.latitude);
    const lng = Number(property.longitude);
    if (
      map.current &&
      property.latitude != null &&
      property.longitude != null &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      isFinite(lat) &&
      isFinite(lng)
    ) {
      map.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
      popup.current
        ?.setLngLat([lng, lat])
        .setHTML(createPopupHTML(property))
        .addTo(map.current);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.notLoggedIn}>
          <p>Please log in to view search results.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading search results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={() => router.push('/buyerSearch')} className={styles.backButton}>
          Go to Search
        </button>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No properties found matching your criteria.</p>
          <button onClick={() => router.push('/buyerSearch')} className={styles.backButton}>
            Try Another Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Search Results</h1>
        <p className={styles.subtitle}>
          Found {properties.length} {properties.length === 1 ? 'property' : 'properties'} matching your criteria
          {searchCriteria && (
            <> • {searchCriteria.propertyType} • {searchCriteria.cityInseeCode} • Section {searchCriteria.cadastralSection}</>
          )}
        </p>
      </div>

      <div className={styles.mapLayout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Properties ({properties.length})</h2>
            <p className={styles.sidebarSubtitle}>Ranked by match score</p>
          </div>
          <div className={styles.propertyList}>
            {properties.map((property, index) => (
              <div
                key={property.propertyId}
                className={`${styles.propertyItem} ${
                  selectedPropertyId === property.propertyId ? styles.propertyItemSelected : ''
                }`}
                onClick={() => handlePropertyClick(property)}
              >
                <div className={styles.propertyRank}>#{index + 1}</div>
                <button
                  className={`${styles.favouriteButton} ${
                    favourites[property.propertyId] ? styles.favouriteActive : ''
                  }`}
                  onClick={(e) => toggleFavourite(property.propertyId, e)}
                  disabled={updatingFavourites[property.propertyId]}
                  title={favourites[property.propertyId] ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={favourites[property.propertyId] ? '#e74c3c' : 'none'}
                    stroke={favourites[property.propertyId] ? '#e74c3c' : '#999'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <div className={styles.propertyItemContent}>
                  <div className={styles.propertyAddress}>{property.address}</div>
                  <div className={styles.propertyDetails}>
                    <span>{property.type}</span>
                    <span>•</span>
                    <span>{property.area} m²</span>
                    {property.bedrooms > 0 && (
                      <>
                        <span>•</span>
                        <span>{property.bedrooms} bed</span>
                      </>
                    )}
                  </div>
                  <div className={styles.propertyPrice}>{formatPrice(property.estimatedPrice)}</div>
                  <div className={styles.propertyScore}>
                    Match: <strong>{property.rankScore.toFixed(1)}/100</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mapContainer} ref={mapContainer} />
      </div>
    </div>
  );
}

