import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  query?: string;
  onClear?: () => void;
}

export default function EmptyState({ query, onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <SearchX className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-neutral-900">No matching jobs found</h3>
      <p className="mt-1 text-xs text-neutral-500 max-w-sm">
        {query
          ? `No job listings matched "${query}". Try adjusting your filters or search terms.`
          : 'No job listings available under the selected filters.'}
      </p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-mono font-semibold text-white transition hover:bg-neutral-800"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
