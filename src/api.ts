import type { Health, Job, JobsResponse, Stats } from '@/types';

const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'https://signal-rbcd.onrender.com';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '').replace(/\/api$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const cleanPath = path.startsWith('/api/') || path === '/api'
    ? path.slice(4)
    : path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${API_BASE}/api${cleanPath}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data as T;
}

export function fetchJobs(params: { q?: string; tags?: string; limit?: number }): Promise<Job[]> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.tags) search.set('tags', params.tags);
  if (params.limit) search.set('limit', String(params.limit));
  return request<JobsResponse>(`/jobs?${search.toString()}`).then((data) => data.jobs);
}

export const fetchHealth = () => request<Health>('/health');
export const fetchStats = () => request<Stats>('/stats');
export const syncJobs = () => request<Health>('/sync', { method: 'POST' });
