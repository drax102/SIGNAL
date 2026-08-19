import { MapPin, Globe, ArrowUpRight } from 'lucide-react';
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
        return 'bg-stone-800 text-stone-100 border-stone-700';
      case 'jobicy':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'remotive':
        return 'bg-teal-100 text-teal-900 border-teal-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  const skills = (job.skills && job.skills.length > 0) ? job.skills : (job.tags || []);
  const maxDisplaySkills = 5;
  const visibleSkills = skills.slice(0, maxDisplaySkills);
  const remainingSkillCount = skills.length - maxDisplaySkills;

  return (
    <div
      onClick={() => onSelect(job)}
      className="group cursor-pointer flex flex-col justify-between rounded-xl border border-[#D9E2DC] bg-white p-4 transition-all hover:border-[#1F6F54] hover:shadow-md hover:translate-y-[-1px]"
    >
      <div>
        {/* Top Header: Company Name & Source Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {job.logo ? (
              <img
                src={job.logo}
                alt=""
                className="h-8 w-8 flex-shrink-0 rounded bg-[#F4F7F5] object-cover border border-[#D9E2DC]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[#12372A] text-white font-bold font-mono text-xs">
                {job.company ? job.company.charAt(0).toUpperCase() : 'C'}
              </div>
            )}
            <span className="truncate text-xs font-mono font-bold uppercase tracking-wider text-[#66736C]">
              {job.company}
            </span>
          </div>

          <span
            className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold border flex-shrink-0 uppercase ${getSourceBadgeStyle(
              job.source
            )}`}
          >
            {job.source}
          </span>
        </div>

        {/* Job Title */}
        <h3 className="mt-2.5 text-base font-extrabold text-[#17211C] group-hover:text-[#12372A] leading-snug">
          {job.title}
        </h3>

        {/* Location & Remote status */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#66736C]">
          <span className="inline-flex items-center gap-1 font-medium text-[#17211C]">
            <MapPin className="h-3.5 w-3.5 text-[#1F6F54]" />
            {job.location}
          </span>

          {job.is_india && (
            <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-900">
              🇮🇳 India
            </span>
          )}

          {job.remote && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#1F6F54] font-semibold">
              <Globe className="h-3 w-3 text-[#1F6F54]" />
              Remote
            </span>
          )}
        </div>

        {/* Skills Section */}
        <div className="mt-3.5 pt-3 border-t border-[#D9E2DC]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#66736C]">
              SKILLS
            </span>
          </div>

          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visibleSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-[#D9E2DC] bg-[#F4F7F5] px-2 py-0.5 text-[11px] font-mono font-bold text-[#12372A]"
                >
                  {skill}
                </span>
              ))}
              {remainingSkillCount > 0 && (
                <span className="rounded-md border border-[#D9E2DC] bg-[#E8EFEA] px-2 py-0.5 text-[11px] font-mono font-bold text-[#1F6F54]">
                  +{remainingSkillCount}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-mono italic text-[#66736C]">Skills not specified</p>
          )}
        </div>

        {/* Category & Employment Type */}
        <div className="mt-3 text-[11px] font-mono text-[#66736C]">
          <span>Category: </span>
          <span className="font-bold text-[#17211C]">
            {job.category || 'Other'}
          </span>
          {job.employment_type && (
            <span> · {job.employment_type}</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-[#D9E2DC] pt-2.5 text-xs font-mono">
        <span className="text-[11px] text-[#66736C]">
          {job.posted ? relativeTime(job.posted) : 'Recently posted'}
        </span>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-bold text-[#12372A] hover:text-[#1F6F54] transition-colors"
        >
          View Job
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
