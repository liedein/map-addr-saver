import { useState, useEffect } from "react";
import KakaoMap from "@/components/KakaoMap";
import ToastNotification from "@/components/ToastNotification";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { RefreshCw } from "lucide-react";

// 통신사, 유형 옵션 정의
const telcoOptions = ["KT", "LGU"];
const typeOptions = ["단독시설", "불법시설물", "특이동향"];

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

export interface ToastData {
  message: string;
  type: "success" | "error";
  isVisible: boolean;
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [telco, setTelco] = useState(""); // 통신사 상태
  const [type, setType] = useState("");   // 유형 상태
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation();
  const { usageCount, isUsageLimitExceeded, refetchUsage } = useUsageLimit();

  useEffect(() => {
    if (!selectedLocation && currentLocation) {
      setSelectedLocation(currentLocation);
    }
  }, [currentLocation, selectedLocation]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast(null), 2000);
  };

  // 지도에서 위치를 선택했을 때 처리
  const handleLocationSelect = async (location: LocationData) => {
    if (isUsageLimitExceeded) {
      showToast("오늘 조회 한도(100회)에 도달했습니다.", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/coordinate-to-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lng: location.lng }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "주소를 가져오는데 실패했습니다.");
      }

      const data = await response.json();
      setSelectedLocation({
        lat: location.lat,
        lng: location.lng,
        address: data.address,
      });

      refetchUsage();
    } catch (error) {
      console.error("주소 변환 오류:", error);
      showToast(error instanceof Error ? error.message : "주소를 가져오는데 실패했습니다.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 복사 버튼 클릭 시 클립보드에 값 저장
  const handleCopyToClipboard = async () => {
    if (!selectedLocation || !selectedLocation.address || !telco || !type) {
      showToast("모든 값을 선택해주세요.", "error");
      return;
    }

    // 요구한 포맷에 맞게 값 구성
    const copyText =
      `통신사: ${telco}\n` +
      `유형: ${type}\n` +
      `위도: ${selectedLocation.lat.toFixed(6)}\n` +
      `경도: ${selectedLocation.lng.toFixed(6)}\n` +
      `지번주소: ${selectedLocation.address}`;

    try {
      await navigator.clipboard.writeText(copyText);
      showToast("클립보드에 복사되었습니다!", "success");
    } catch (error) {
      console.error("복사 실패:", error);
      showToast("복사에 실패했습니다.", "error");
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="flex w-full items-center px-4 py-4">
          <div className="w-12" />
          <h1 className="text-xl font-semibold text-gray-50 flex-grow text-center">
            내 주변 주소 조회
          </h1>
          <div className="w-12 flex justify-end">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 flex flex-col relative">
        {/* 지도 영역 */}
        <div className="relative" style={{ height: "45.5vh" }}>
          <KakaoMap
            initialLocation={currentLocation}
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            isLoading={isLoading || isLoadingLocation}
          />
          {/* 지도 주소 오버레이 */}
          {selectedLocation?.address && (
            <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 max-w-xs shadow-lg">
              <p className="text-sm text-gray-100 font-medium">
                {selectedLocation.address}
              </p>
            </div>
          )}
        </div>

        {/* 입력 폼 영역 */}
        <div className="bg-gray-800 border-t border-gray-700 py-4 px-3 flex flex-col space-y-3">
          {/* 통신사 드롭다운 */}
          <div className="flex items-center space-x-3">
            <label className="text-xs text-gray-400 w-16 flex-shrink-0">통신사</label>
            <select
              className="bg-gray-700 text-gray-100 px-3 py-2 rounded-md flex-1"
              value={telco}
              onChange={e => setTelco(e.target.value)}
            >
              <option value="">선택</option>
              {telcoOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {/* 유형 드롭다운 */}
            <label className="text-xs text-gray-400 w-12 flex-shrink-0 text-right">유형</label>
            <select
              className="bg-gray-700 text-gray-100 px-3 py-2 rounded-md flex-1"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="">선택</option>
              {typeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          {/* 위도 */}
          <div className="flex items-center space-x-3">
            <label className="text-xs text-gray-400 w-16 flex-shrink-0">위도</label>
            <input
              className="text-sm font-mono bg-gray-700 px-3 py-2 rounded-md text-gray-100 flex-1"
              value={selectedLocation ? selectedLocation.lat.toFixed(6) : ""}
              readOnly
            />
          </div>
          {/* 경도 */}
          <div className="flex items-center space-x-3">
            <label className="text-xs text-gray-400 w-16 flex-shrink-0">경도</label>
            <input
              className="text-sm font-mono bg-gray-700 px-3 py-2 rounded-md text-gray-100 flex-1"
              value={selectedLocation ? selectedLocation.lng.toFixed(6) : ""}
              readOnly
            />
          </div>
          {/* 지번주소 + 복사 버튼 */}
          <div className="flex items-start space-x-3">
            <label className="text-xs text-gray-400 w-16 flex-shrink-0 pt-2">지번주소</label>
            <input
              className="text-sm bg-gray-700 px-3 py-2 rounded-md text-gray-100 flex-1"
              value={selectedLocation?.address || ""}
              readOnly
              placeholder="위치를 선택해주세요"
            />
            <button
              onClick={handleCopyToClipboard}
              aria-label="클립보드 복사"
              disabled={!selectedLocation?.address || !telco || !type || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed h-[40px] self-center"
            >
              <span className="text-xs">복사</span>
            </button>
          </div>
          {/* 사용 횟수 카운터 */}
          <div className="mt-auto text-center pb-0">
            <span className="text-xs text-gray-400">오늘 조회 횟수: </span>
            <span className="text-xs text-emerald-400 font-medium">{usageCount}</span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        </div>
      </main>
      {/* 알림 */}
      <ToastNotification toast={toast} />
    </div>
  );
}