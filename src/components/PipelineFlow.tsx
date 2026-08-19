import { useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, ArrowRight, Play, RotateCcw } from 'lucide-react';
import type { SourceMetrics } from '@/types';
import { simulateSourceFailure } from '@/api';

interface PipelineFlowProps {
  sources: SourceMetrics[];
  onRefresh: () => void;
}

export default function PipelineFlow({ sources, onRefresh }: PipelineFlowProps) {
  const [selectedSource, setSelectedSource] = useState('Jobicy');
  const [failureType, setFailureType] = useState('timeout');
  const [isSimulating, setIsSimulating] = useState(false);

  const pipelineStages = [
    { label: 'SOURCE', sub: 'APIs & Feeds' },
    { label: 'FETCH', sub: 'Async HTTP' },
    { label: 'NORMALIZE', sub: 'Schema Map' },
    { label: 'VALIDATE', sub: 'Quality Check' },
    { label: 'DEDUPE', sub: 'URL / Sig Match' },
    { label: 'SERVE', sub: 'FastAPI / UI' },
  ];

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await simulateSourceFailure(selectedSource, failureType);
      onRefresh();
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetAll = async () => {
    setIsSimulating(true);
    try {
      for (const src of ['RemoteOK', 'Jobicy', 'Remotive']) {
        await simulateSourceFailure(src, 'reset');
      }
      onRefresh();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const getSourceBadgeStyle = (source: string) => {
    switch (source.toLowerCase()) {
      case 'remoteok':
        return 'bg-stone-800 text-stone-100 border-stone-700';
      case 'jobicy':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'remotive':
        return 'bg-teal-100 text-teal-900 border-teal-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  return (
    <div className="rounded-xl border border-[#D9E2DC] bg-white p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E2DC] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#12372A]" />
          <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#12372A]">
            INGESTION PIPELINE & SOURCE OBSERVABILITY
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[#66736C]">
          FAULT-TOLERANT MULTI-SOURCE ARCHITECTURE
        </span>
      </div>

      {/* Pipeline Stage Flow Diagram */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F4F7F5] p-3 border border-[#D9E2DC]">
        {pipelineStages.map((stage, idx) => (
          <div key={stage.label} className="flex items-center gap-2">
            <div className="text-center">
              <span className="block text-[11px] font-mono font-bold text-[#12372A]">
                {stage.label}
              </span>
              <span className="block text-[9px] font-mono text-[#66736C]">
                {stage.sub}
              </span>
            </div>
            {idx < pipelineStages.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-[#1F6F54] flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Per-Source Observability Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sources.map((src) => {
          const isHealthy = src.status === 'healthy';
          return (
            <div
              key={src.source}
              className="rounded-lg border border-[#D9E2DC] bg-[#F4F7F5] p-3 text-xs font-mono flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getSourceBadgeStyle(src.source)}`}>
                    {src.source}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isHealthy
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {isHealthy ? (
                      <CheckCircle className="h-3 w-3 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-700" />
                    )}
                    {isHealthy ? 'Healthy' : 'Degraded'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-y-1 gap-x-2 text-[11px]">
                  <div>
                    <span className="text-[#66736C]">Fetched: </span>
                    <span className="font-bold text-[#17211C]">{src.fetched}</span>
                  </div>
                  <div>
                    <span className="text-[#66736C]">Accepted: </span>
                    <span className="font-bold text-emerald-800">{src.accepted}</span>
                  </div>
                  <div>
                    <span className="text-[#66736C]">Rejected: </span>
                    <span className="font-bold text-red-700">{src.rejected}</span>
                  </div>
                  <div>
                    <span className="text-[#66736C]">Deduped: </span>
                    <span className="font-bold text-blue-700">{src.duplicates}</span>
                  </div>
                </div>
              </div>

              {src.last_error && (
                <p className="mt-2 truncate text-[10px] text-red-700 font-bold bg-red-50 p-1 rounded border border-red-200">
                  {src.last_error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Failure Simulation Bar (Dev / Interview Demo Control) - Hidden in Production */}
      {(import.meta.env.DEV || import.meta.env.MODE === 'development') && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9E2DC] pt-3 bg-[#F4F7F5] p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-[#12372A] uppercase">
              🧪 INTERVIEW DEMO CONTROL:
            </span>
            <span className="text-[10px] font-mono text-[#66736C]">
              Simulate source failures safely
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="rounded border border-[#D9E2DC] bg-white px-2 py-1 font-bold text-[#17211C]"
            >
              <option value="Jobicy">Jobicy</option>
              <option value="RemoteOK">RemoteOK</option>
              <option value="Remotive">Remotive</option>
            </select>

            <select
              value={failureType}
              onChange={(e) => setFailureType(e.target.value)}
              className="rounded border border-[#D9E2DC] bg-white px-2 py-1 font-bold text-[#17211C]"
            >
              <option value="timeout">Timeout</option>
              <option value="http_error">HTTP 500 Error</option>
              <option value="empty">Empty Response</option>
              <option value="malformed">Malformed Payload</option>
            </select>

            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="inline-flex items-center gap-1 rounded bg-[#12372A] px-2.5 py-1 text-white font-bold hover:bg-[#1F6F54] transition-colors disabled:opacity-50"
            >
              <Play className="h-3 w-3 text-[#D6A84F]" />
              Simulate
            </button>

            <button
              onClick={handleResetAll}
              disabled={isSimulating}
              className="inline-flex items-center gap-1 rounded bg-[#E8EFEA] border border-[#D9E2DC] px-2.5 py-1 text-[#17211C] font-bold hover:bg-[#D9E2DC] transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3 text-[#1F6F54]" />
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
