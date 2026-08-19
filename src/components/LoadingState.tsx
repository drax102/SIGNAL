export default function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-neutral-200" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-1/3 rounded bg-neutral-200" />
              <div className="h-4 w-2/3 rounded bg-neutral-200" />
            </div>
          </div>
          <div className="h-3 w-1/2 rounded bg-neutral-200" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-5 w-14 rounded bg-neutral-200" />
            <div className="h-5 w-16 rounded bg-neutral-200" />
            <div className="h-5 w-12 rounded bg-neutral-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
