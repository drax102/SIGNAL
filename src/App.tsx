import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import PipelineFlow from '@/components/PipelineFlow';
import KpiCards from '@/components/KpiCards';
import SearchBar from '@/components/SearchBar';
import JobCard from '@/components/JobCard';
import JobDetailDrawer from '@/components/JobDetailDrawer';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import { fetchHealth, fetchJobs, fetchStats, syncJobs } from '@/api';
import type { Health, Job, Stats } from '@/types';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const refresh = useCallback(
    async (qStr: string, locStr: string, srcStr: string) => {
      setLoading(true);
      setError(null);
      try {
        const [data, h, s] = await Promise.all([
          fetchJobs({
            q: qStr || undefined,
            location: locStr !== 'All' ? locStr : undefined,
            source: srcStr !== 'All Sources' ? srcStr : undefined,
            limit: 200,
          }),
          fetchHealth(),
          fetchStats(),
        ]);
        setJobs(data);
        setHealth(h);
        setStats(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to job service');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    try {
      const updatedHealth = await syncJobs();
      const updatedStats = await fetchStats();
      const updatedJobs = await fetchJobs({
        q: query || undefined,
        location: locationFilter !== 'All' ? locationFilter : undefined,
        source: sourceFilter !== 'All Sources' ? sourceFilter : undefined,
        limit: 200,
      });

      setHealth(updatedHealth);
      setStats(updatedStats);
      setJobs(updatedJobs);

      const degradedSources = Object.entries(updatedHealth.sources || {})
        .filter(([, status]) => status !== 'healthy')
        .map(([src]) => src);

      if (degradedSources.length > 0) {
        setSyncMessage(
          `⚠ ${degradedSources.join(', ')} unavailable — processed ${updatedStats.stored} jobs from active sources.`
        );
      } else {
        setSyncMessage(
          `✓ Processed ${updatedStats.stored} jobs from ${updatedStats.sources} active sources (RemoteOK, Jobicy, Remotive).`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    refresh('', 'All', 'All Sources');
  }, [refresh]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => refresh(query, locationFilter, sourceFilter),
      350
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, locationFilter, sourceFilter, refresh]);

  // Client side sorting
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'company') {
      return a.company.localeCompare(b.company);
    }
    if (sortBy === 'newest') {
      const dateA = a.posted ? new Date(a.posted).getTime() : 0;
      const dateB = b.posted ? new Date(b.posted).getTime() : 0;
      return dateB - dateA;
    }
    return 0; // relevance
  });

  return (
    <div className="min-h-screen bg-[#f8f8f6] text-neutral-900 font-sans antialiased">
      <Header
        health={health}
        syncing={syncing}
        onSync={handleSync}
        syncMessage={syncMessage}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* KPI Summary Cards */}
        <KpiCards stats={stats} health={health} />

        {/* Data Pipeline Technical Visualization */}
        <PipelineFlow health={health} stats={stats} />

        {/* Search & Filter Bar */}
        <SearchBar
          value={query}
          onChange={setQuery}
          locationFilter={locationFilter}
          onLocationChange={setLocationFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          resultCount={sortedJobs.length}
        />

        {/* Error State */}
        {error && (
          <ErrorState
            message={error}
            health={health}
            onRetry={() => refresh(query, locationFilter, sourceFilter)}
          />
        )}

        {/* Fallback Alert Banner if applicable */}
        {health?.mode === 'fallback' && !error && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-mono text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold uppercase tracking-wider">⚠ Fallback dataset active:</span>{' '}
              Live provider APIs are currently unreachable. Showing local cached demo dataset.
            </div>
            <button
              onClick={handleSync}
              className="underline font-bold hover:text-amber-950 ml-2"
            >
              Retry Live Sync
            </button>
          </div>
        )}

        {/* Job Grid / Loading / Empty State */}
        {loading ? (
          <LoadingState />
        ) : sortedJobs.length === 0 ? (
          <EmptyState
            query={query}
            onClear={() => {
              setQuery('');
              setLocationFilter('All');
              setSourceFilter('All Sources');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {sortedJobs.map((job) => (
              <JobCard key={job.id} job={job} onSelect={setSelectedJob} />
            ))}
          </div>
        )}

        {/* Side Panel Drawer for Selected Job */}
        <JobDetailDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />

        {/* Footer */}
        <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
          <p>SIGNAL — Multi-Source Job Intelligence Platform</p>
          <p className="text-neutral-400">
            Sources: RemoteOK · Jobicy · Remotive
          </p>
        </footer>
      </main>
    </div>
  );
}
