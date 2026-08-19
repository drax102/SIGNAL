import { Radio, RefreshCw } from 'lucide-react';

export default function Header({ status, mode, syncing, onSync }: {
  status: string;
  mode: string;
  syncing: boolean;
  onSync: () => void;
}) {
  const healthy = status === 'healthy' && mode === 'live';
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm"><Radio className="h-5 w-5" /></div>
          <div><h1 className="text-lg font-semibold leading-none tracking-tight text-slate-950">Signal</h1><p className="mt-0.5 text-xs text-slate-500">Job ingestion, made observable.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <span className={`mr-1.5 mt-0.5 h-1.5 w-1.5 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {healthy ? 'Live source' : 'Degraded / fallback'}
          </span>
          <button onClick={onSync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing' : 'Sync now'}
          </button>
        </div>
      </div>
    </header>
  );
}
