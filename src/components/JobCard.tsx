import { MapPin, ExternalLink, Building2, Wallet } from 'lucide-react';
import type { Job } from '@/types';
import { relativeTime } from '@/utils';

export default function JobCard({ job }: { job: Job }) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {job.logo ? (
          <img
            src={job.logo}
            alt=""
            className="h-11 w-11 flex-shrink-0 rounded-lg bg-slate-50 object-cover ring-1 ring-slate-100"
          />
        ) : (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-slate-700">
            {job.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{job.company}</p>
        </div>
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {job.location}
        </span>
        {job.salary && (
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-slate-400" />
            {job.salary}
          </span>
        )}
        {job.posted && (
          <span className="ml-auto text-slate-400">{relativeTime(job.posted)}</span>
        )}
      </div>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {job.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
