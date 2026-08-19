export interface Job {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  is_india?: boolean;
  category?: string;
  employment_type?: string;
  skills: string[];
  tags: string[];
  url: string;
  logo: string;
  salary: string;
  posted: string;
  description?: string;
}

export interface JobsResponse {
  count: number;
  total?: number;
  jobs: Job[];
}

export interface Health {
  status: 'healthy' | 'degraded' | 'not_synced' | 'error';
  mode: 'live' | 'fallback';
  sources: Record<string, 'healthy' | 'degraded' | 'error' | 'not_synced'>;
  last_attempt: string | null;
  last_success: string | null;
  last_error: string | null;
}

export interface Stats {
  fetched: number;
  accepted: number;
  rejected: number;
  stored: number;
  sources: number;
  by_source: Record<string, number>;
  india_jobs: number;
  remote_jobs: number;
}
