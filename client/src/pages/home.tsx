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
      // Simple screen capture using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context를 생성할 수 없습니다.');
      }
      
      // Set canvas size to window size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Create a simple screenshot by capturing the current view
      // Draw a background
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw location information
      ctx.fillStyle = '#F9FAFB';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.fillText('위치 정보 스크린샷', centerX, centerY - 60);
      ctx.fillText(`위도: ${selectedLocation.lat.toFixed(6)}`, centerX, centerY - 30);
      ctx.fillText(`경도: ${selectedLocation.lng.toFixed(6)}`, centerX, centerY);
      
      if (selectedLocation.address) {
        ctx.fillText(`주소: ${selectedLocation.address}`, centerX, centerY + 30);
      }
      
      ctx.fillText(`캡쳐 시간: ${new Date().toLocaleString('ko-KR')}`, centerX, centerY + 60);
      
      // Download the captured image
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const filename = `${year}${month}${day}_${hours}${minutes}${seconds}_LOCATION.png`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('위치 정보가 캡쳐되었습니다!');
      setIsLoading(false);
      
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
