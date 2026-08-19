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
    <header className="sticky top-0 z-30 border-b border-[#D9E2DC] bg-[#F4F7F5]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#12372A] text-white shadow-xs">
            <Radio className="h-4 w-4 text-[#D6A84F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider text-[#17211C] font-mono uppercase">
                SIGNAL <span className="text-[#1F6F54] font-semibold text-xs ml-1">JOB INTELLIGENCE</span>
              </h1>
            </div>
            <p className="text-xs text-[#66736C]">Aggregated jobs. Clean data. No noise.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHealthy && isLive ? 'bg-[#D6A84F] animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className={isHealthy && isLive ? 'text-[#12372A]' : 'text-amber-800'}>
                {isLive ? (isHealthy ? '● LIVE' : '● DEGRADED') : '● FALLBACK'}
              </span>
            </div>
            <span className="text-[11px] text-[#66736C]">
              Last synced: {formatLastSynced(health?.last_success)}
            </span>
          </div>

          <button
            onClick={onSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#12372A] px-4 py-2 text-xs font-semibold font-mono text-white transition-all hover:bg-[#1F6F54] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#D6A84F] ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing sources...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="border-t border-[#D9E2DC] bg-[#E8EFEA] px-4 py-1.5 text-xs text-[#17211C] font-mono">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            {syncMessage.includes('⚠') ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-[#1F6F54] flex-shrink-0" />
            )}
            <span>{syncMessage}</span>
          </div>
        </div>
      )}
    </header>
  );
}
