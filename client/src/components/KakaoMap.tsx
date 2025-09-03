import { useEffect, useRef, useCallback } from "react";
import { LocationData } from "@/pages/home";

interface KakaoMapProps {
  initialLocation?: LocationData | null;
  selectedLocation?: LocationData | null;
  onLocationSelect?: (location: LocationData) => void;
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
      level: 3,
    };

    mapInstance.current = new window.kakao.maps.Map(mapRef.current, mapOption);

    // 지도 클릭 이벤트 등록
    window.kakao.maps.event.addListener(mapInstance.current, "click", function (mouseEvent: any) {
      const latlng = mouseEvent.latLng;
      if (onLocationSelect) {
        onLocationSelect({ lat: latlng.getLat(), lng: latlng.getLng() });
      }
    });

    // 최초 마커
    if (selectedLocation) {
      addMarker(selectedLocation.lat, selectedLocation.lng);
      mapInstance.current.setCenter(new window.kakao.maps.LatLng(selectedLocation.lat, selectedLocation.lng));
    }
    // eslint-disable-next-line
  }, []);

  // selectedLocation이 바뀔 때마다 지도 중심과 마커 이동
  useEffect(() => {
    if (!window.kakao || !mapInstance.current) return;
    if (selectedLocation) {
      addMarker(selectedLocation.lat, selectedLocation.lng);
      mapInstance.current.setCenter(new window.kakao.maps.LatLng(selectedLocation.lat, selectedLocation.lng));
    }
  }, [selectedLocation, addMarker]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden bg-gray-800" />
  );
}