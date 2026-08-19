import type { Health, Job, JobsResponse, Stats } from '@/types';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
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
