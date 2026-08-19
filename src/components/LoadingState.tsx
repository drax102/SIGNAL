import { Loader2 } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
      <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      <p className="text-sm">Fetching jobs…</p>
    </div>
  );
}
