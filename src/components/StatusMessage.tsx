import { AlertCircle, Loader2 } from 'lucide-react';
import { secondaryButtonClass } from '@/lib/styles';

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-stone-500">
      <Loader2 className="h-8 w-8 animate-spin text-pine-600" aria-hidden="true" />
      <p className="text-sm">Cargando películas...</p>
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-ember-200 bg-ember-50 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3 text-ember-800">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className={secondaryButtonClass}>
        Reintentar
      </button>
    </div>
  );
}
