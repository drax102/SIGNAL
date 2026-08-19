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
      accent: 'border-l-4 border-l-[#12372A]',
    },
    {
      label: 'REMOTE',
      value: stats?.remote_jobs ?? 0,
      sub: 'Global remote listings',
      icon: Globe,
      accent: 'border-l-4 border-l-[#1F6F54]',
    },
    {
      label: 'INDIA',
      value: stats?.india_jobs ?? 0,
      sub: 'India geographic match',
      icon: MapPin,
      accent: 'border-l-4 border-l-[#D6A84F]',
    },
    {
      label: 'SOURCES',
      value: activeSourcesCount,
      sub: 'RemoteOK, Jobicy, Remotive',
      icon: Layers,
      accent: 'border-l-4 border-l-[#12372A]',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className={`rounded-xl border border-[#D9E2DC] bg-white p-4 shadow-xs ${kpi.accent} flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#66736C] uppercase">
                {kpi.label}
              </span>
              <Icon className="h-4 w-4 text-[#1F6F54]" />
            </div>
            <div className="mt-2">
              <p className="text-3xl font-extrabold font-mono tracking-tight text-[#17211C]">
                {kpi.value}
              </p>
              <p className="mt-1 text-[11px] text-[#66736C] font-mono">{kpi.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
