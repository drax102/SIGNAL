import type { Job, JobsResponse, Health, Stats, SourcesResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function fetchJobs(params?: {
  q?: string;
  source?: string;
  location?: string;
  category?: string;
  tags?: string;
  limit?: number;
}): Promise<JobsResponse> {
  const url = new URL(`${API_BASE}/jobs`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.append(key, String(val));
      }
    });
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchSources(): Promise<SourcesResponse> {
  const res = await fetch(`${API_BASE}/sources`);
  if (!res.ok) {
    throw new Error(`Sources check failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) {
    throw new Error(`Stats fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function syncJobs(): Promise<Health> {
  const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }
  return res.json();
}

export async function simulateSourceFailure(source: string, failureType: string): Promise<any> {
  const res = await fetch(
    `${API_BASE}/test/simulate-failure?source=${encodeURIComponent(source)}&type=${encodeURIComponent(failureType)}`,
    { method: 'POST' }
  );
  if (!res.ok) {
    throw new Error(`Simulation failed: ${res.status}`);
  }
  return res.json();
}
