import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, CheckCircle2, Database, ShieldAlert, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import JobCard from '@/components/JobCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { fetchHealth, fetchJobs, fetchStats, syncJobs } from '@/api';
import type { Health, Job, Stats } from '@/types';

const formatTime = (value?: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const refresh = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const [data, h, s] = await Promise.all([fetchJobs({ q: q || undefined, limit: 60 }), fetchHealth(), fetchStats()]);
      setJobs(data); setHealth(h); setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally { setLoading(false); }
  }, []);

  const handleSync = async () => {
    setSyncing(true); setError(null);
    try { await syncJobs(); await refresh(query); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sync failed'); }
    finally { setSyncing(false); }
  };

  useEffect(() => { refresh(''); }, [refresh]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refresh(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, refresh]);

  const healthy = health?.status === 'healthy' && health.mode === 'live';
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <Header status={health?.status ?? 'not_synced'} mode={health?.mode ?? 'fallback'} syncing={syncing} onSync={handleSync} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">INGESTION MONITOR</p><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reliable job data, without the noise.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">A small, observable pipeline that fetches, validates, deduplicates and serves public job listings.</p></div>
            <div className="text-xs text-slate-500"><p>Source: <span className="font-medium text-slate-700">{health?.source ?? 'Loading…'}</span></p><p className="mt-1">Last successful sync: <span className="font-medium text-slate-700">{formatTime(health?.last_success)}</span></p></div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Jobs stored', stats?.stored ?? 0, Database],
              ['Accepted', stats?.accepted ?? 0, CheckCircle2],
              ['Rejected', stats?.rejected ?? 0, XCircle],
              ['Source', healthy ? 'LIVE' : 'FALLBACK', healthy ? Activity : ShieldAlert],
            ].map(([label, value, Icon]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><Icon className="h-4 w-4 text-slate-400" /></div><p className="mt-2 text-xl font-semibold tracking-tight">{value as string | number}</p></div>)}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {['Fetch', 'Normalize', 'Validate', 'Deduplicate', 'Serve'].map((stage, index) => <div key={stage} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${index === 0 && !healthy ? 'bg-amber-500' : 'bg-emerald-500'}`} />{stage}{index < 4 && <span className="text-slate-300">→</span>}</div>)}
          </div>
        </section>

        <div className="mb-5"><SearchBar value={query} onChange={setQuery} resultCount={jobs.length} /></div>
        {error && <div className="mb-5"><ErrorState message={error} onRetry={() => refresh(query)} /></div>}
        {loading ? <LoadingState /> : jobs.length === 0 ? <EmptyState query={query} /> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{jobs.map(job => <JobCard key={job.id} job={job} />)}</div>}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex sm:items-center sm:justify-between"><p>Signal uses a bounded retry policy and explicit fallback mode.</p><p className="mt-1 sm:mt-0">Public source demo: RemoteOK</p></footer>
      </main>
    </div>
  );
}
