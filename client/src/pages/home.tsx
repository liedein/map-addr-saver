import { useState, useEffect } from "react";
import KakaoMap from "@/components/KakaoMap";
import LocationInfo from "@/components/LocationInfo";
import ToastNotification from "@/components/ToastNotification";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUsageLimit } from "@/hooks/useUsageLimit";

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

  const handleDownloadImage = async () => {
    if (!selectedLocation) {
      showToast('캡쳐할 위치가 선택되지 않았습니다.', 'error');
      return;
    }

    if (isUsageLimitExceeded) {
      showToast('오늘 조회 한도(100회)에 도달했습니다.', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use html2canvas to capture the actual webpage
      const html2canvas = await import('html2canvas');
      
      // Capture the entire body element
      const canvas = await html2canvas.default(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1F2937', // Dark background
        scale: 1, // 1:1 scale
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });
      
      // Download the captured image
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const filename = `${year}${month}${day}_${hours}${minutes}${seconds}_SCREENSHOT.png`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('웹 페이지가 캡쳐되었습니다!');
      setIsLoading(false);
      
      // Refresh usage count
      refetchUsage();
      
    } catch (error) {
      console.error('화면 캡쳐 실패:', error);
      showToast('화면 캡쳐에 실패했습니다.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-center text-gray-50" data-testid="header-title">
            내 주변 주소 조회
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Map Section - 55% of screen height */}
        <div className="relative" style={{ height: '55vh' }}>
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

        {/* Info Section - 45% of screen height */}
        <div className="bg-gray-800 border-t border-gray-700" style={{ height: '45vh' }}>
          <LocationInfo
            location={selectedLocation}
            usageCount={usageCount}
            onCopy={handleCopyToClipboard}
            onDownload={handleDownloadImage}
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
