'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PotentialBuyersModal from '@/components/PotentialBuyersModal';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { favouritePropertyService } from '@/services/favourite-property.service';
import type { PropertyEstimateResponse } from '@/types/estimate';
import styles from './page.module.css';

const PROPERTIES_SOURCE_ID = 'properties';
const PROPERTIES_LAYER_ID = 'properties-pins';

// Pin size: double size, constant when zoomed out, grows to 3x at max zoom
const PIN_SIZE_ZOOMED_OUT = 1;     // floor — 2x previous, don't get smaller when zooming out
const PIN_SIZE_MAX_ZOOM = 3;       // at max zoom (20), 2x previous max
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

interface PropertyEstimate {
  propertyId: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedPrice?: number;
  type: string;
  area: number;
  bedrooms: number;
}

function buildPropertiesGeoJSON(properties: PropertyEstimate[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point, { propertyId: string }>[] = properties
    .filter(
      (p: PropertyEstimate) =>
        p.latitude != null &&
        p.longitude != null &&
        !isNaN(Number(p.latitude)) &&
        !isNaN(Number(p.longitude)) &&
        isFinite(Number(p.latitude)) &&
        isFinite(Number(p.longitude))
    )
    .map((p: PropertyEstimate) => ({
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

function MyPropertiesMapContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [properties, setProperties] = useState<PropertyEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [potentialBuyersPropertyId, setPotentialBuyersPropertyId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const propertiesRef = useRef<PropertyEstimate[]>([]);
  const initialUrlFocusDoneRef = useRef(false);

  const token = session?.backendToken;

  // Keep ref in sync so pin click handler always has latest properties (avoids stale closure)
  useEffect(() => {
    propertiesRef.current = properties;
  }, [properties]);

  useEffect(() => {
    if (token) {
      fetchProperties();
    } else {
      setLoading(false);
    }
  }, [token, searchParams]);

  useEffect(() => {
    if (properties.length > 0 && mapContainer.current && !map.current) {
      initializeMap();
    } else if (map.current && map.current.getSource(PROPERTIES_SOURCE_ID)) {
      // Update existing map source when properties change
      const geojson = buildPropertiesGeoJSON(properties);
      (map.current.getSource(PROPERTIES_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(geojson);
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

  // Handle propertyId from URL only once on initial load (so switching pins/cards is not overwritten)
  useEffect(() => {
    if (!mapLoaded || !map.current || properties.length === 0 || !popup.current || initialUrlFocusDoneRef.current) return;

    const propertyIdFromUrl = searchParams?.get('propertyId');
    if (!propertyIdFromUrl) return;

    const propertyToFocus = properties.find((p) => p.propertyId === propertyIdFromUrl);
    if (propertyToFocus && propertyToFocus.latitude != null && propertyToFocus.longitude != null) {
      const lat = Number(propertyToFocus.latitude);
      const lng = Number(propertyToFocus.longitude);
      if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
        initialUrlFocusDoneRef.current = true;
        setSelectedPropertyId(propertyIdFromUrl);
        const coords: [number, number] = [lng, lat];
        popup.current.setLngLat(coords).setHTML(createPopupHTML(propertyToFocus)).addTo(map.current);
        map.current.flyTo({ center: coords, zoom: 15, duration: 1000 });
      }
    }
  }, [mapLoaded, properties, searchParams]);

  const fetchProperties = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const source = searchParams?.get('source') || 'estimates';
      let data: PropertyEstimateResponse[];
      if (source === 'favourites') {
        data = await favouritePropertyService.getUserFavourites(token);
      } else {
        data = await propertyEstimateService.getMyEstimates(token);
      }
      const propertiesWithCoords = data
        .map((p: PropertyEstimateResponse) => ({
          ...p,
          latitude: p.latitude ? Number(p.latitude) : undefined,
          longitude: p.longitude ? Number(p.longitude) : undefined,
        }))
        .filter(
          (p: PropertyEstimate) =>
            p.latitude != null &&
            p.longitude != null &&
            !isNaN(p.latitude) &&
            !isNaN(p.longitude) &&
            isFinite(p.latitude) &&
            isFinite(p.longitude)
        );
      setProperties(propertiesWithCoords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || map.current) return;

    // Set Mapbox access token (you'll need to set this in your .env.local)
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXV4NTFmZmYzMnAydGJ1b3V6YjMifQ.rJcFIG214AriISLbB6B5aw';
    
    mapboxgl.accessToken = mapboxToken;

    // Calculate center from properties or use default
    const center = calculateMapCenter();
    
    // Validate center coordinates before initializing map
    if (!center || center.length !== 2 || isNaN(center[0]) || isNaN(center[1]) || !isFinite(center[0]) || !isFinite(center[1])) {
      console.error('Invalid center coordinates:', center);
      return;
    }
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center as [number, number],
      zoom: properties.length === 1 ? 15 : 12,
      // Keep a single world copy so markers stay fixed to coordinates when panning/zooming
      renderWorldCopies: false,
    });

    map.current.on('load', async () => {
      const m = map.current!;
      const geojson = buildPropertiesGeoJSON(properties);
      m.addSource(PROPERTIES_SOURCE_ID, { type: 'geojson', data: geojson });

      const pinSvg = getPinSvgHex('#e74c3c');
      const pinSelectedSvg = getPinSvgHex('#c0392b');
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

      // Offset popup up so it stems from the center of the pin circle (tip is at coords, circle is above)
      popup.current = new mapboxgl.Popup({ offset: [0, -35], closeOnClick: false });
      m.on('click', PROPERTIES_LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const propertyId = String(f.properties?.propertyId ?? (f as GeoJSON.Feature & { id?: string }).id ?? '');
        if (!propertyId) return;
        const currentProperties = propertiesRef.current;
        const property = currentProperties.find((p) => p.propertyId === propertyId || String(p.propertyId) === propertyId);
        if (!property) return;
        // Use the feature's coordinates (actual property location), not click position —
        // e.lngLat is where the user clicked on the icon and can be wrong when the icon is large
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        if (!coords || coords.length < 2) return;
        setSelectedPropertyId(property.propertyId);
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
      // Default center (France)
      return [2.3522, 48.8566];
    }

    // Calculate center from all properties
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

    // Validate the calculated center
    if (isNaN(avgLng) || isNaN(avgLat) || !isFinite(avgLng) || !isFinite(avgLat)) {
      return [2.3522, 48.8566];
    }

    return [avgLng, avgLat];
  };

  const createPopupHTML = (property: PropertyEstimate): string => {
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
        <div style="display: flex; gap: 0.5rem; font-size: 0.875rem; color: #666; flex-wrap: wrap;">
          <span>${property.type}</span>
          <span>•</span>
          <span>${property.area} m²</span>
          ${property.bedrooms > 0 ? `<span>•</span><span>${property.bedrooms} bed</span>` : ''}
        </div>
      </div>
    `;
  };

  const handlePropertyClick = (property: PropertyEstimate) => {
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
      // Ensure popup exists (e.g. if sidebar card was clicked before map load finished)
      if (!popup.current) {
        popup.current = new mapboxgl.Popup({ offset: [0, -35], closeOnClick: false });
      }
      map.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
      popup.current
        .setLngLat([lng, lat])
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

  const backButton = (
    <button
      type="button"
      className={styles.backButton}
      onClick={() => router.back()}
      title="Back to previous page"
    >
      ← Back
    </button>
  );

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.headerWithBack}>
          {backButton}
        </div>
        <div className={styles.notLoggedIn}>
          <p>Please log in to view your properties on the map.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerWithBack}>
          {backButton}
        </div>
        <div className={styles.loading}>Loading properties...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerWithBack}>
          {backButton}
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const listSource = searchParams?.get('source') || 'estimates';
  const showPotentialBuyersButton = listSource !== 'favourites';

  if (properties.length === 0) {
    const source = listSource;
    return (
      <div className={styles.container}>
        <div className={styles.headerWithBack}>
          {backButton}
        </div>
        <div className={styles.empty}>
          <p>
            {source === 'favourites' 
              ? 'No favourite properties with coordinates found.'
              : 'No properties with coordinates found.'}
          </p>
          <p className={styles.emptySubtext}>
            Properties need latitude and longitude to be displayed on the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {backButton}
        <h1 className={styles.title}>
          {listSource === 'favourites' ? 'My Favourite Properties' : 'My Saved Properties'}
        </h1>
        <p className={styles.subtitle}>
          {listSource === 'favourites' 
            ? 'View all your favourite properties on an interactive map'
            : 'View all your properties on an interactive map'}
        </p>
      </div>

      <div className={styles.mapLayout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Properties ({properties.length})</h2>
          </div>
          <div className={styles.propertyList}>
            {properties.map((property) => (
              <div
                key={property.propertyId}
                className={`${styles.propertyItem} ${
                  selectedPropertyId === property.propertyId ? styles.propertyItemSelected : ''
                }`}
                onClick={() => handlePropertyClick(property)}
              >
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
                  {showPotentialBuyersButton && token && (
                    <button
                      type="button"
                      className={styles.potentialBuyersButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPotentialBuyersPropertyId(property.propertyId);
                      }}
                      aria-label="Potential buyers"
                    >
                      Potential buyers
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mapContainer} ref={mapContainer} />
      </div>

      <PotentialBuyersModal
        open={potentialBuyersPropertyId !== null}
        onClose={() => setPotentialBuyersPropertyId(null)}
        propertyId={potentialBuyersPropertyId ?? ''}
        token={token}
      />
    </div>
  );
}

export default function MyPropertiesMapPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading map...</div>}>
      <MyPropertiesMapContent />
    </Suspense>
  );
}
