import { useEffect, useRef, useCallback } from "react";
import { LocationData } from "@/pages/home";

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
  isLoading,
}: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  const addMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstance.current || !window.kakao) return;

    if (markerInstance.current) {
      markerInstance.current.setMap(null);
    }

    const markerPosition = new window.kakao.maps.LatLng(lat, lng);
    markerInstance.current = new window.kakao.maps.Marker({
      position: markerPosition,
    });

    markerInstance.current.setMap(mapInstance.current);
  }, []);

  // 최초 지도 생성은 컴포넌트 마운트 시 단 한 번만 수행
  useEffect(() => {
    if (!window.kakao || !mapRef.current) return;

    const defaultLat = initialLocation?.lat ?? 37.5665;
    const defaultLng = initialLocation?.lng ?? 126.978;

    const mapOption = {
      center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
      level: 2,
    };

    mapInstance.current = new window.kakao.maps.Map(mapRef.current, mapOption);

    const clickListener = window.kakao.maps.event.addListener(
      mapInstance.current,
      "click",
      (mouseEvent: any) => {
        const latLng = mouseEvent.latLng;
        onLocationSelect({ lat: latLng.getLat(), lng: latLng.getLng() });
      }
    );

    if (initialLocation) {
      addMarker(initialLocation.lat, initialLocation.lng);
    }

    return () => {
      if (clickListener) {
        window.kakao.maps.event.removeListener(clickListener);
      }
    };
  }, [initialLocation, addMarker, onLocationSelect]);

  // 선택 위치 변경 시 지도 중심을 해당 위치로 이동
  useEffect(() => {
    if (selectedLocation && mapInstance.current) {
      addMarker(selectedLocation.lat, selectedLocation.lng);
      mapInstance.current.setCenter(
        new window.kakao.maps.LatLng(selectedLocation.lat, selectedLocation.lng)
      );
    }
  }, [selectedLocation, addMarker]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-full bg-gray-800"
        data-testid="map-container"
      />

      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center"
          data-testid="loading-overlay"
        >
          <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
            <div
              className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent"
              data-testid="loading-spinner"
            ></div>
            <span
              className="text-sm font-medium text-gray-100"
              data-testid="loading-text"
            >
              위치 정보를 가져오는 중...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
