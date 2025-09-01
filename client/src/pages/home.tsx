import { useState, useEffect } from "react";
import KakaoMap from "@/components/KakaoMap";
import LocationInfo from "@/components/LocationInfo";
import ToastNotification from "@/components/ToastNotification";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { RefreshCw } from "lucide-react";

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

export interface ToastData {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [toast, setToast] = useState<ToastData>({ message: '', type: 'success', isVisible: false });
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentLocation, isLoadingLocation, locationError } = useGeolocation();
  const { usageCount, isUsageLimitExceeded, refetchUsage } = useUsageLimit();

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  // Handle location error
  useEffect(() => {
    if (locationError) {
      showToast('위치 정보를 가져올 수 없습니다. 기본 위치로 설정됩니다.', 'error');
    }
  }, [locationError]);

  // Set initial location when current location is available
  useEffect(() => {
    if (currentLocation && !selectedLocation) {
      setSelectedLocation(currentLocation);
    }
  }, [currentLocation, selectedLocation]);

  const handleLocationSelect = async (location: LocationData) => {
    if (isUsageLimitExceeded) {
      showToast('오늘 조회 한도(100회)에 도달했습니다.', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/coordinate-to-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: location.lat,
          lng: location.lng,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '주소를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      setSelectedLocation({
        lat: location.lat,
        lng: location.lng,
        address: data.address,
      });

      // Refresh usage count
      refetchUsage();
      
    } catch (error) {
      console.error('주소 변환 오류:', error);
      showToast(error instanceof Error ? error.message : '주소를 가져오는데 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!selectedLocation || !selectedLocation.address) {
      showToast('복사할 정보가 없습니다.', 'error');
      return;
    }

    const copyText = `위도 : ${selectedLocation.lat.toFixed(6)}\n경도 : ${selectedLocation.lng.toFixed(6)}\n지번주소 : ${selectedLocation.address}`;

    try {
      await navigator.clipboard.writeText(copyText);
      showToast('클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
      showToast('복사에 실패했습니다.', 'error');
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    window.location.reload();
  };



  return (
    <div className="min-h-screen bg-gray-900 text-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex-1"></div>
          <h1 className="text-xl font-semibold text-gray-50 flex-1 text-center" data-testid="header-title">
            내 주변 주소 조회
          </h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="새로고침"
              data-testid="refresh-button"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Map Section - 65% of screen height */}
        <div className="relative" style={{ height: '65vh' }}>
          <KakaoMap
            initialLocation={currentLocation}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            isLoading={isLoading || isLoadingLocation}
            data-testid="kakao-map"
          />
          
          {/* Map Address Overlay */}
          {selectedLocation?.address && (
            <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 max-w-xs shadow-lg" data-testid="map-address-overlay">
              <p className="text-sm text-gray-100 font-medium" data-testid="map-address">
                {selectedLocation.address}
              </p>
            </div>
          )}
        </div>

        {/* Info Section - 35% of screen height */}
        <div className="bg-gray-800 border-t border-gray-700 py-4">
          <LocationInfo
            location={selectedLocation}
            usageCount={usageCount}
            onCopy={handleCopyToClipboard}
            isLoading={isLoading}
            data-testid="location-info"
          />
        </div>
      </main>

      {/* Toast Notification */}
      <ToastNotification
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        data-testid="toast-notification"
      />
    </div>
  );
}
