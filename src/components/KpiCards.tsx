import { Database, Globe, MapPin, Layers } from 'lucide-react';
import type { Stats, Health } from '@/types';

interface KpiCardsProps {
  stats: Stats | null;
  health: Health | null;
}

export default function KpiCards({ stats, health }: KpiCardsProps) {
  const activeSourcesCount = health?.sources
    ? Object.values(health.sources).filter((s) => s === 'healthy').length
    : 0;

  const kpis = [
    {
      label: 'TOTAL JOBS',
      value: stats?.stored ?? 0,
      sub: `${stats?.fetched ?? 0} fetched`,
      icon: Database,
    },
    {
      label: 'REMOTE JOBS',
      value: stats?.remote_jobs ?? 0,
      sub: 'Global remote listings',
      icon: Globe,
    },
    {
      label: 'INDIA JOBS',
      value: stats?.india_jobs ?? 0,
      sub: 'India geographic match',
      icon: MapPin,
    },
    {
      label: 'ACTIVE SOURCES',
      value: `${activeSourcesCount} / 3`,
      sub: health?.mode === 'live' ? 'RemoteOK, Jobicy, Remotive' : 'Fallback mode',
      icon: Layers,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono font-semibold tracking-wider text-neutral-500 uppercase">
                {kpi.label}
              </p>
              <Icon className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-neutral-900">
              {kpi.value}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">{kpi.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
