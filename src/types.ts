export interface Job {
  id: number | string;
  title: string;
  company: string;
  location: string;
  tags: string[];
  url: string;
  logo: string;
  salary: string;
  posted: string;
  source: string;
}

export interface JobsResponse { count: number; jobs: Job[]; }
export interface Health {
  status: 'healthy' | 'degraded' | 'not_synced';
  mode: 'live' | 'fallback';
  source: string;
  last_attempt: string | null;
  last_success: string | null;
  last_error: string | null;
}
export interface Stats { fetched: number; accepted: number; rejected: number; stored: number; }
