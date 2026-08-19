import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (loc: string) => void;
  sourceFilter: string;
  onSourceChange: (src: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  resultCount: number;
}

export default function SearchBar({
  value,
  onChange,
  locationFilter,
  onLocationChange,
  sourceFilter,
  onSourceChange,
  sortBy,
  onSortChange,
  resultCount,
}: SearchBarProps) {
  const locations = [
    { id: 'All', label: 'All' },
    { id: 'India', label: '🇮🇳 India' },
    { id: 'Remote', label: '🌐 Remote' },
    { id: 'Global', label: '🌍 Global' },
  ];

  const sources = [
    { id: 'All Sources', label: 'All Sources' },
    { id: 'RemoteOK', label: 'RemoteOK' },
    { id: 'Jobicy', label: 'Jobicy' },
    { id: 'Remotive', label: 'Remotive' },
  ];

  const sortOptions = [
    { id: 'newest', label: 'Newest' },
    { id: 'company', label: 'Company' },
    { id: 'relevance', label: 'Relevance' },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search jobs, companies, skills..."
          className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-9 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-neutral-100 pt-3">
        {/* Location Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-neutral-400 mr-1 text-[11px]">LOCATION:</span>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onLocationChange(loc.id)}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                locationFilter === loc.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Source & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-neutral-400 text-[11px]">SOURCE:</span>
            <select
              value={sourceFilter}
              onChange={(e) => onSourceChange(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 font-medium text-neutral-700 hover:border-neutral-300 focus:outline-none"
            >
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-neutral-400 text-[11px]">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 font-medium text-neutral-700 hover:border-neutral-300 focus:outline-none"
            >
              {sortOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <span className="font-mono text-[11px] text-neutral-400">
            ({resultCount} listings)
          </span>
        </div>
      </div>
    </div>
  );
}
