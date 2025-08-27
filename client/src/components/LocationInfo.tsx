import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { LocationData } from '@/pages/home';

interface LocationInfoProps {
  location: LocationData | null;
  usageCount: number;
  onCopy: () => void;
  onDownload: () => void;
  isLoading?: boolean;
}

export default function LocationInfo({ 
  location, 
  usageCount, 
  onCopy, 
  onDownload, 
  isLoading 
}: LocationInfoProps) {
    return (
    <div className="px-3 pt-3 pb-2 h-full flex flex-col">
      {/* Coordinate Information */}
      <div className="space-y-1">
        {/* Latitude */}
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-400 w-16 flex-shrink-0">위도</div>
          <div className="flex-1">
            <div className="text-sm font-mono bg-gray-700 px-3 py-2 rounded-md text-gray-100" data-testid="latitude-display">
              {location ? location.lat.toFixed(6) : '37.566500'}
            </div>
          </div>
        </div>

        {/* Longitude */}
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-400 w-16 flex-shrink-0">경도</div>
          <div className="flex-1">
            <div className="text-sm font-mono bg-gray-700 px-3 py-2 rounded-md text-gray-100" data-testid="longitude-display">
              {location ? location.lng.toFixed(6) : '126.978000'}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start space-x-3">
          <div className="text-xs text-gray-400 w-16 flex-shrink-0 pt-2">지번주소</div>
          <div className="flex-1">
            <div className="text-sm bg-gray-700 px-3 py-2 rounded-md text-gray-100 leading-relaxed" data-testid="address-display">
              {location?.address || '위치를 선택해주세요'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-2 space-x-3 flex">
        {/* Copy Button */}
        <Button
          onClick={onCopy}
          disabled={!location?.address || isLoading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-copy"
        >
          <Copy className="w-4 h-4" />
          <span>클립보드 복사</span>
        </Button>

                 {/* Download Button */}
         <Button
           onClick={onDownload}
           disabled={isLoading}
           className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
           data-testid="button-download"
         >
           <Download className="w-4 h-4" />
           <span>화면 캡쳐</span>
         </Button>
      </div>

      {/* Usage Counter */}
      <div className="mt-2 text-center pb-0">
        <span className="text-xs text-gray-400">오늘 조회 횟수: </span>
        <span className="text-xs text-emerald-400 font-medium" data-testid="usage-count">
          {usageCount}
        </span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  );
}