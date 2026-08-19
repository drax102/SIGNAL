import { MapPin, Building2, Wallet, ArrowUpRight, Globe } from 'lucide-react';
import type { Job } from '@/types';
import { relativeTime } from '@/utils';

interface JobCardProps {
  job: Job;
  onSelect: (job: Job) => void;
}

export default function JobCard({ job, onSelect }: JobCardProps) {
  const getSourceBadgeStyle = (source: string) => {
    switch (source.toLowerCase()) {
      case 'remoteok':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'jobicy':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'remotive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <div
      onClick={() => onSelect(job)}
      className="group cursor-pointer flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-md"
    >
      <div>
        {/* Header: Logo, Company, Source Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {job.logo ? (
              <img
                src={job.logo}
                alt=""
                className="h-10 w-10 flex-shrink-0 rounded-lg bg-neutral-50 object-cover border border-neutral-100"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-neutral-100 font-bold font-mono text-sm">
                {job.company ? job.company.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {job.company}
              </p>
              <h3 className="truncate text-sm font-bold text-neutral-900 group-hover:text-neutral-700">
                {job.title}
              </h3>
            </div>
          </div>

          <span
            className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-medium flex-shrink-0 ${getSourceBadgeStyle(
              job.source
            )}`}
          >
            {job.source}
          </span>
        </div>

        {/* Meta Info: Location, Remote, Salary */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
          <span className="inline-flex items-center gap-1 font-medium">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            {job.location}
          </span>

          {job.is_india && (
            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-medium text-amber-800">
              🇮🇳 India
            </span>
          )}

          {job.remote && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
              <Globe className="h-3 w-3 text-neutral-400" />
              Remote
            </span>
          )}

          {job.salary && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-700 font-medium">
              <Wallet className="h-3.5 w-3.5 text-neutral-400" />
              {job.salary}
            </span>
          )}
        </div>

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-neutral-100 border border-neutral-200/60 px-2 py-0.5 text-[10px] font-mono font-medium text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs">
        <span className="text-[11px] text-neutral-400 font-mono">
          {job.posted ? relativeTime(job.posted) : 'Recently posted'}
        </span>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-medium text-neutral-900 transition-colors hover:text-neutral-600"
        >
          View Job
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
