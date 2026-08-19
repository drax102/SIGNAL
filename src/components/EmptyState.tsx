import { SearchX } from 'lucide-react';

export default function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <SearchX className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">No jobs found</p>
        <p className="mt-1 text-xs text-slate-500">
          {query
            ? `Nothing matched "${query}". Try a different search.`
            : 'No job listings are available right now.'}
        </p>
      </div>
    </div>
  );
}
