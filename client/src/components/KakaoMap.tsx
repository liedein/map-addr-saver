import { useEffect, useRef } from 'react';
import { LocationData } from '@/pages/home';

interface KakaoMapProps {
  initialLocation?: LocationData | null;
  selectedLocation?: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  isLoading?: boolean;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ 
  initialLocation, 
  selectedLocation, 
  onLocationSelect, 
  isLoading 
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  useEffect(() => {
    if (!window.kakao || !mapRef.current) return;

    // Initialize map
    const defaultLat = initialLocation?.lat || 37.5665;
    const defaultLng = initialLocation?.lng || 126.9780;

    const mapOption = {
      center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
      level: 2,
    };

    mapInstance.current = new window.kakao.maps.Map(mapRef.current, mapOption);

    // Add click event listener
    window.kakao.maps.event.addListener(mapInstance.current, 'click', (mouseEvent: any) => {
      const latLng = mouseEvent.latLng;
      const lat = latLng.getLat();
      const lng = latLng.getLng();
      
      onLocationSelect({ lat, lng });
    });

    // Add initial marker if location exists
    if (initialLocation) {
      addMarker(initialLocation.lat, initialLocation.lng);
    }

  }, [initialLocation]);

  // Update marker when selected location changes
  useEffect(() => {
    if (selectedLocation && mapInstance.current) {
      addMarker(selectedLocation.lat, selectedLocation.lng);
      
      // Move map center to selected location
      const moveLatLon = new window.kakao.maps.LatLng(selectedLocation.lat, selectedLocation.lng);
      mapInstance.current.setCenter(moveLatLon);
    }
  }, [selectedLocation]);

  const addMarker = (lat: number, lng: number) => {
    if (!mapInstance.current || !window.kakao) return;

    // Remove existing marker
    if (markerInstance.current) {
      markerInstance.current.setMap(null);
    }

    // Add new marker
    const markerPosition = new window.kakao.maps.LatLng(lat, lng);
    markerInstance.current = new window.kakao.maps.Marker({
      position: markerPosition,
    });

    markerInstance.current.setMap(mapInstance.current);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full bg-gray-800" data-testid="map-container" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center" data-testid="loading-overlay">
          <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" data-testid="loading-spinner"></div>
            <span className="text-sm font-medium text-gray-100" data-testid="loading-text">
              위치 정보를 가져오는 중...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}