import { AlertCircle, RefreshCw } from 'lucide-react';
import type { Health } from '@/types';

interface ErrorStateProps {
  message?: string;
  health?: Health | null;
  onRetry: () => void;
}

export default function ErrorState({ message, health, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-6 text-amber-900">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold font-mono">Job sources are temporarily unavailable</h3>
          <p className="mt-1 text-xs text-amber-800">
            {message || 'Upstream provider connection error or request timeout.'}
          </p>

          {health?.sources && (
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
              {Object.entries(health.sources).map(([src, status]) => (
                <div
                  key={src}
                  className="rounded border border-amber-200 bg-white/80 px-2.5 py-1 flex items-center justify-between"
                >
                  <span>{src}</span>
                  <span className={status === 'healthy' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3.5 py-2 text-xs font-mono font-semibold text-white hover:bg-amber-800 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}
