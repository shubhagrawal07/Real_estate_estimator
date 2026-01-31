'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './page.module.css';

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

export default function MyPropertiesMapPage() {
  const { data: session } = useSession();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [properties, setProperties] = useState<PropertyEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (session && (session as any).backendToken) {
      fetchProperties();
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (properties.length > 0 && mapContainer.current && !map.current) {
      initializeMap();
    }

    return () => {
      // Cleanup markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [properties]);

  useEffect(() => {
    // Update marker styles when selection changes
    if (mapLoaded && markers.current.length > 0) {
      markers.current.forEach((marker, index) => {
        const property = properties[index];
        if (property && marker.getElement()) {
          const el = marker.getElement();
          if (el) {
            const isSelected = selectedPropertyId === property.propertyId;
            (el as HTMLElement).style.backgroundColor = isSelected ? '#667eea' : '#764ba2';
            (el as HTMLElement).style.transform = isSelected ? 'scale(1.2)' : 'scale(1)';
          }
        }
      });
    }
  }, [selectedPropertyId, mapLoaded, properties]);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = (session as any).backendToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/user/my-estimates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      // Filter and normalize properties that have valid coordinates
      const propertiesWithCoords = data
        .map((p: any) => ({
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
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      addMarkers();
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

  const addMarkers = () => {
    if (!map.current) return;

    // Remove existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    properties.forEach((property) => {
      const lat = Number(property.latitude);
      const lng = Number(property.longitude);
      
      // Validate coordinates are valid numbers
      if (
        property.latitude == null || 
        property.longitude == null || 
        isNaN(lat) || 
        isNaN(lng) ||
        !isFinite(lat) ||
        !isFinite(lng)
      ) return;

      // Create marker element
      const el = document.createElement('div');
      el.className = styles.marker;
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = selectedPropertyId === property.propertyId ? '#667eea' : '#764ba2';
      el.style.border = '3px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.transition = 'all 0.2s';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      
      // Add a simple dot indicator
      const dot = document.createElement('div');
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = 'white';
      el.appendChild(dot);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: false })
        .setHTML(createPopupHTML(property));

      marker.setPopup(popup);

      // Add click handler
      el.addEventListener('click', () => {
        setSelectedPropertyId(property.propertyId);
        if (map.current && !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          map.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1500,
          });
        }
      });

      markers.current.push(marker);
    });
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
      // Fly to property location
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1500,
      });

      // Open popup for the corresponding marker
      const markerIndex = properties.findIndex(p => p.propertyId === property.propertyId);
      if (markerIndex !== -1 && markers.current[markerIndex]) {
        markers.current[markerIndex].togglePopup();
      }
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
          <p>Please log in to view your properties on the map.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading properties...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No properties with coordinates found.</p>
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
        <h1 className={styles.title}>My Saved Properties</h1>
        <p className={styles.subtitle}>View all your properties on an interactive map</p>
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

