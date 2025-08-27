import { CheckCircle, XCircle } from 'lucide-react';

interface ToastNotificationProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
}

export default function ToastNotification({ message, type, isVisible }: ToastNotificationProps) {
  return (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 text-gray-100 px-4 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[-100px] opacity-0'
      }`}
      data-testid="toast-container"
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0" data-testid="toast-icon">
          {type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
        </div>
        <div className="text-sm font-medium" data-testid="toast-message">
          {message}
        </div>
      </div>
    </div>
  );
}