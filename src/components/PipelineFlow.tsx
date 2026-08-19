import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { Health, Stats } from '@/types';

interface PipelineFlowProps {
  health: Health | null;
  stats: Stats | null;
}

export default function PipelineFlow({ health, stats }: PipelineFlowProps) {
  const sources = [
    { name: 'RemoteOK', key: 'RemoteOK' },
    { name: 'Jobicy', key: 'Jobicy' },
    { name: 'Remotive', key: 'Remotive' },
  ];

  const getSourceStatus = (key: string) => {
    if (!health || !health.sources) return 'not_synced';
    return health.sources[key] || 'not_synced';
  };

  const getSourceCount = (key: string) => {
    if (!stats || !stats.by_source) return 0;
    return stats.by_source[key] || 0;
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
        <div>
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-800">
            DATA PIPELINE
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Multi-source concurrent ingestion & deduplication flow
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-neutral-400">Total Valid Ingested:</span>
          <span className="font-bold text-neutral-900">{stats?.accepted ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        {/* Source Nodes */}
        <div className="md:col-span-2 space-y-2">
          {sources.map((src) => {
            const status = getSourceStatus(src.key);
            const count = getSourceCount(src.key);
            const isHealthy = status === 'healthy';

            return (
              <div
                key={src.key}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-medium text-neutral-900">{src.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-neutral-500">{count} jobs</span>
                  {isHealthy ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrow connector */}
        <div className="hidden md:flex items-center justify-center text-neutral-300">
          <span className="font-mono text-sm">┼──→</span>
        </div>

        {/* Pipeline steps */}
        <div className="md:col-span-2 grid grid-cols-3 gap-1.5 text-center">
          {[
            { label: 'Normalize', desc: 'Unified Schema' },
            { label: 'Validate', desc: 'Quality Check' },
            { label: 'Deduplicate', desc: 'Composite Keys' },
          ].map((step) => (
            <div
              key={step.label}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs"
            >
              <p className="font-mono font-semibold text-neutral-900 text-[11px]">{step.label}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
