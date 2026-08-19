import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (loc: string) => void;
  sourceFilter: string;
  onSourceChange: (src: string) => void;
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;
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
  categoryFilter,
  onCategoryChange,
  sortBy,
  onSortChange,
  resultCount,
}: SearchBarProps) {
  const locations = [
    { id: 'All', label: 'All Jobs' },
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

  const categories = [
    { id: 'All', label: 'All' },
    { id: 'Engineering', label: 'Engineering' },
    { id: 'Design', label: 'Design' },
    { id: 'Marketing', label: 'Marketing' },
    { id: 'Sales', label: 'Sales' },
    { id: 'Support', label: 'Support' },
    { id: 'Data', label: 'Data' },
  ];

  const sortOptions = [
    { id: 'newest', label: 'Newest' },
    { id: 'company', label: 'Company' },
    { id: 'relevance', label: 'Relevance' },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-[#D9E2DC] bg-white p-4 shadow-xs">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-[#66736C]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search jobs, companies, skills..."
          className="w-full rounded-lg border border-[#D9E2DC] bg-[#F4F7F5] py-2.5 pl-10 pr-9 text-sm text-[#17211C] placeholder-[#66736C] transition-colors focus:border-[#12372A] focus:bg-white focus:outline-none font-mono"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 text-[#66736C] hover:text-[#17211C]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Row 1: Location & Category */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-[#D9E2DC] pt-3">
        {/* Location Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[#66736C] mr-1 text-[11px] font-bold uppercase">LOCATION:</span>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onLocationChange(loc.id)}
              className={`rounded-md px-3 py-1 font-mono text-xs font-bold transition-all ${
                locationFilter === loc.id
                  ? 'bg-[#12372A] text-white shadow-xs'
                  : 'bg-[#E8EFEA] text-[#17211C] hover:bg-[#D9E2DC]'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[#66736C] mr-1 text-[11px] font-bold uppercase">CATEGORY:</span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                categoryFilter === cat.id
                  ? 'bg-[#12372A] text-white shadow-xs'
                  : 'bg-[#E8EFEA] text-[#17211C] hover:bg-[#D9E2DC]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row 2: Source & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-t border-[#D9E2DC] pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[#66736C] mr-1 text-[11px] font-bold uppercase">SOURCE:</span>
          {sources.map((src) => (
            <button
              key={src.id}
              onClick={() => onSourceChange(src.id)}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                sourceFilter === src.id
                  ? 'bg-[#12372A] text-white shadow-xs'
                  : 'bg-[#E8EFEA] text-[#17211C] hover:bg-[#D9E2DC]'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[#66736C] text-[11px] font-bold uppercase">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded-md border border-[#D9E2DC] bg-[#F4F7F5] px-2 py-1 font-mono text-xs font-bold text-[#17211C] focus:outline-none"
            >
              {sortOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <span className="font-mono text-[11px] text-[#1F6F54] font-bold bg-[#E8EFEA] px-2 py-0.5 rounded border border-[#D9E2DC]">
            {resultCount} LISTINGS
          </span>
        </div>
      </div>
    </div>
  );
}
