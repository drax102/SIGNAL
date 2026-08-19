import { X, ExternalLink, MapPin, Wallet, Calendar, Globe, Building2, Layers } from 'lucide-react';
import type { Job } from '@/types';
import { relativeTime } from '@/utils';

interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
}

export default function JobDetailDrawer({ job, onClose }: JobDetailDrawerProps) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/40 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <span className="rounded border border-neutral-300 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-700">
              {job.source}
            </span>
            {job.is_india && (
              <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                🇮🇳 India Relevant
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Main Title & Company */}
          <div className="flex items-start gap-4">
            {job.logo ? (
              <img
                src={job.logo}
                alt=""
                className="h-14 w-14 rounded-xl bg-neutral-50 object-cover border border-neutral-200 flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-900 text-white font-bold text-lg font-mono flex-shrink-0">
                {job.company ? job.company.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">{job.title}</h2>
              <p className="mt-1 text-sm font-semibold text-neutral-600 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-neutral-400" />
                {job.company}
              </p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-xs font-mono">
            <div>
              <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">Location</span>
              <span className="font-semibold text-neutral-800 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                {job.location}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">Work Type</span>
              <span className="font-semibold text-neutral-800 flex items-center gap-1 mt-0.5">
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
                {job.remote ? 'Remote' : 'Onsite / Hybrid'}
              </span>
            </div>
            {job.salary && (
              <div>
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">Salary</span>
                <span className="font-semibold text-neutral-900 flex items-center gap-1 mt-0.5">
                  <Wallet className="h-3.5 w-3.5 text-neutral-400" />
                  {job.salary}
                </span>
              </div>
            )}
            <div>
              <span className="text-neutral-400 text-[10px] uppercase tracking-wider block">Posted Date</span>
              <span className="font-semibold text-neutral-800 flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                {job.posted ? relativeTime(job.posted) : 'Recently'}
              </span>
            </div>
          </div>

          {/* Skills / Tags */}
          {job.tags && job.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> Skills & Categories
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-mono font-medium text-neutral-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description Section */}
          {job.description && (
            <div className="space-y-2 border-t border-neutral-200 pt-5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                Job Overview
              </h3>
              <div className="text-xs leading-relaxed text-neutral-700 whitespace-pre-line bg-neutral-50/50 p-4 rounded-xl border border-neutral-200/60 max-h-96 overflow-y-auto">
                {job.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-neutral-200 p-4 bg-white">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-xs font-bold font-mono uppercase tracking-wider text-white shadow-sm transition-all hover:bg-neutral-800"
          >
            <span>View Original Job on {job.source}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
