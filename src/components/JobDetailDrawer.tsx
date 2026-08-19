import { X, ExternalLink, MapPin, Wallet, Calendar, Globe, Building2, Layers, Tag, ShieldCheck } from 'lucide-react';
import type { Job } from '@/types';
import { relativeTime } from '@/utils';

interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
}

export default function JobDetailDrawer({ job, onClose }: JobDetailDrawerProps) {
  if (!job) return null;

  const skills = (job.skills && job.skills.length > 0) ? job.skills : (job.tags || []);

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
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#17211C]/50 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col border-l border-[#D9E2DC] animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#D9E2DC] px-6 py-4 bg-[#F4F7F5]">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2.5 py-0.5 font-mono text-[11px] font-bold border uppercase ${getSourceBadgeStyle(
                job.source
              )}`}
            >
              {job.source}
            </span>

            {job.is_india && (
              <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                🇮🇳 India
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#66736C] hover:bg-[#D9E2DC] hover:text-[#17211C] transition-colors"
            title="Close Drawer"
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
                className="h-14 w-14 rounded-xl bg-[#F4F7F5] object-cover border border-[#D9E2DC] flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#12372A] text-white font-bold text-lg font-mono flex-shrink-0">
                {job.company ? job.company.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-extrabold text-[#17211C] tracking-tight leading-snug">
                {job.title}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#1F6F54] flex items-center gap-1.5 font-mono uppercase">
                <Building2 className="h-4 w-4 text-[#66736C]" />
                {job.company}
              </p>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#D9E2DC] bg-[#F4F7F5] p-4 text-xs font-mono">
            <div>
              <span className="text-[#66736C] text-[10px] uppercase font-bold tracking-wider block">Location</span>
              <span className="font-bold text-[#17211C] flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-[#1F6F54]" />
                {job.location}
              </span>
            </div>
            <div>
              <span className="text-[#66736C] text-[10px] uppercase font-bold tracking-wider block">Work Type</span>
              <span className="font-bold text-[#17211C] flex items-center gap-1 mt-0.5">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                {job.remote ? 'Remote' : 'Onsite'}
              </span>
            </div>
            <div>
              <span className="text-[#66736C] text-[10px] uppercase font-bold tracking-wider block">Category</span>
              <span className="font-bold text-[#17211C] flex items-center gap-1 mt-0.5">
                <Layers className="h-3.5 w-3.5 text-[#1F6F54]" />
                {job.category || 'Other'}
              </span>
            </div>
            <div>
              <span className="text-[#66736C] text-[10px] uppercase font-bold tracking-wider block">Employment Type</span>
              <span className="font-bold text-[#17211C] flex items-center gap-1 mt-0.5">
                <Tag className="h-3.5 w-3.5 text-[#1F6F54]" />
                {job.employment_type || 'Full-time'}
              </span>
            </div>
            {job.salary && (
              <div>
                <span className="text-[#66736C] text-[10px] uppercase font-bold tracking-wider block">Salary</span>
                <span className="font-bold text-[#12372A] flex items-center gap-1 mt-0.5">
                  <Wallet className="h-3.5 w-3.5 text-[#1F6F54]" />
                  {job.salary}
                </span>
              </div>
            )}
            <div>
              <span className="text-[#66736C] text-[10px] uppercase font-bold tracking-wider block">Posted Date</span>
              <span className="font-bold text-[#17211C] flex items-center gap-1 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-[#66736C]" />
                {job.posted ? relativeTime(job.posted) : 'Recently'}
              </span>
            </div>
          </div>

          {/* SKILLS SECTION */}
          <div className="border-t border-[#D9E2DC] pt-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#12372A] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#1F6F54]" />
              SKILLS
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-[#D9E2DC] bg-[#E8EFEA] px-3 py-1 text-xs font-mono font-bold text-[#12372A]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono italic text-[#66736C]">Skills not specified</p>
            )}
          </div>

          {/* ABOUT THIS ROLE / DESCRIPTION */}
          {job.description && (
            <div className="space-y-2 border-t border-[#D9E2DC] pt-5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#12372A]">
                ABOUT THIS ROLE
              </h3>
              <div className="text-xs leading-relaxed text-[#17211C] font-sans whitespace-pre-line bg-[#F4F7F5] p-4 rounded-xl border border-[#D9E2DC] max-h-96 overflow-y-auto">
                {job.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA: APPLY NOW Button */}
        <div className="border-t border-[#D9E2DC] p-4 bg-white">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#12372A] py-3.5 text-sm font-extrabold font-mono uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#1F6F54] active:scale-98"
          >
            <span>APPLY NOW ON {job.source.toUpperCase()}</span>
            <ExternalLink className="h-4 w-4 text-[#D6A84F]" />
          </a>
        </div>
      </div>
    </div>
  );
}
