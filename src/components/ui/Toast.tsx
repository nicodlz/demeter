import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/hooks/useToast';

export const Toast = () => {
  const { message, type, visible, hide } = useToastStore();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => hide(), 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, message, hide]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium',
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      )}
    >
      {type === 'success' ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" />
      )}
      <span>{message}</span>
      <button onClick={hide} className="ml-2 hover:opacity-70" aria-label="Close toast">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
