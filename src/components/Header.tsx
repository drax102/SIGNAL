import { Radio, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Health } from '@/types';

interface HeaderProps {
  health: Health | null;
  syncing: boolean;
  onSync: () => void;
  syncMessage: string | null;
}

export default function Header({ health, syncing, onSync, syncMessage }: HeaderProps) {
  const isHealthy = health?.status === 'healthy';
  const isLive = health?.mode === 'live';

  const formatLastSynced = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins === 1) return '1 min ago';
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h ago`;
    } catch {
      return '—';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#f8f8f6]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-neutral-50 shadow-sm">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-neutral-900">SIGNAL</h1>
              <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-neutral-600">
                v2.5
              </span>
            </div>
            <p className="text-xs text-neutral-500">Job intelligence, aggregated and explained.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHealthy && isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className={isHealthy && isLive ? 'text-emerald-700' : 'text-amber-700'}>
                {isLive ? (isHealthy ? 'LIVE' : 'DEGRADED') : 'FALLBACK'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">
              Last synced: {formatLastSynced(health?.last_success)}
            </span>
          </div>

          <button
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-50 transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing sources...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="border-t border-neutral-200 bg-neutral-100/80 px-4 py-1.5 text-xs text-neutral-700 font-mono">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            {syncMessage.includes('⚠') ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            )}
            <span>{syncMessage}</span>
          </div>
        </div>
      )}
    </header>
  );
}
