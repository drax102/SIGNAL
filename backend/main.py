"""Signal - Multi-source job ingestion service."""
from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

REMOTEOK_URL = os.getenv("REMOTEOK_URL", "https://remoteok.com/api")
JOBICY_URL = os.getenv("JOBICY_URL", "https://jobicy.com/api/v2/remote-jobs?count=100")
REMOTIVE_URL = os.getenv("REMOTIVE_URL", "https://remotive.com/api/remote-jobs")

MAX_RETRIES = 3
REQUEST_TIMEOUT = 12.0

app = FastAPI(title="Signal API", version="2.5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

state: dict[str, Any] = {
    "status": "not_synced",
    "mode": "live",
    "last_attempt": None,
    "last_success": None,
    "last_error": None,
    "fetched": 0,
    "accepted": 0,
    "rejected": 0,
    "stored": 0,
    "sources": {
        "RemoteOK": "not_synced",
        "Jobicy": "not_synced",
        "Remotive": "not_synced",
    },
    "by_source": {
        "RemoteOK": 0,
        "Jobicy": 0,
        "Remotive": 0,
    },
    "india_jobs": 0,
    "remote_jobs": 0,
    "jobs": [],
}

FALLBACK_JOBS = [
    {
        "id": "fallback-1",
        "source": "Local fallback",
        "title": "Senior Frontend Engineer (Fallback Demo)",
        "company": "Signal Intelligence",
        "location": "Bengaluru, India · Remote",
        "remote": True,
        "is_india": True,
        "tags": ["React", "TypeScript", "TailwindCSS"],
        "url": "https://remoteok.com/",
        "logo": "",
        "salary": "$80,000 - $120,000",
        "posted": datetime.now(timezone.utc).isoformat(),
        "description": "Fallback dataset job listing for demonstration when upstream sources are unreachable.",
    },
    {
        "id": "fallback-2",
        "source": "Local fallback",
        "title": "Backend Systems Architect (Fallback Demo)",
        "company": "Signal Intelligence",
        "location": "Worldwide · Remote",
        "remote": True,
        "is_india": False,
        "tags": ["Python", "FastAPI", "AsyncIO"],
        "url": "https://remotive.com/",
        "logo": "",
        "salary": "$100,000 - $140,000",
        "posted": datetime.now(timezone.utc).isoformat(),
        "description": "Fallback dataset job listing for demonstration when upstream sources are unreachable.",
    },
]

INDIA_KEYWORDS = {
    "india", "bengaluru", "bangalore", "mumbai", "delhi", "ncr", "hyderabad",
    "pune", "chennai", "gurugram", "gurgaon", "noida", "kolkata", "ahmedabad",
    "jaipur", "kochi", "trivandrum", "thiruvananthapuram", "indore", "coimbatore",
    "surat", "vadodara", "nagpur", "jamnagar", "lucknow", "chandigarh",
    "bhubaneswar", "visakhapatnam", "vizag", "mysore", "mysuru", "karnataka",
    "maharashtra", "tamil", "nadu", "telangana", "kerala", "gujarat"
}


def is_india_job(location: str, title: str = "") -> bool:
    loc_clean = (location or "").lower()
    title_clean = (title or "").lower()
    text = f"{loc_clean} {title_clean}"
    tokens = set(re.findall(r"\b\w+\b", text))
    return bool(INDIA_KEYWORDS & tokens)


def is_remote_job(location: str, default: bool = True) -> bool:
    loc = (location or "").lower()
    if any(k in loc for k in ["onsite", "in-office", "on-site"]):
        return False
    if any(k in loc for k in ["remote", "worldwide", "anywhere", "work from home", "wfh", "global"]):
        return True
    return default


def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean = re.sub(r"<[^>]+>", " ", raw_html)
    return " ".join(clean.split())


def normalize_remoteok(raw: dict[str, Any]) -> dict[str, Any] | None:
    job_id = str(raw.get("id") or "").strip()
    title = (raw.get("position") or "").strip()
    company = (raw.get("company") or "").strip()
    url = (raw.get("url") or raw.get("apply_url") or "").strip()
    if not job_id or not title or not company or not url:
        return None

    location = (raw.get("location") or "Remote").strip()
    salary_min = raw.get("salary_min")
    salary_max = raw.get("salary_max")
    salary = ""
    if salary_min and salary_max:
        salary = f"${int(salary_min):,} - ${int(salary_max):,}"
    elif raw.get("salary"):
        salary = str(raw.get("salary")).strip()

    tags = [str(x).strip() for x in (raw.get("tags") or []) if str(x).strip()]

    return {
        "id": f"remoteok-{job_id}",
        "source": "RemoteOK",
        "title": title,
        "company": company,
        "location": location or "Remote",
        "remote": is_remote_job(location),
        "is_india": is_india_job(location, title),
        "tags": tags[:8],
        "url": url,
        "logo": raw.get("company_logo") or raw.get("logo") or "",
        "salary": salary,
        "posted": raw.get("date") or "",
        "description": clean_html(raw.get("description") or ""),
    }


def normalize_jobicy(raw: dict[str, Any]) -> dict[str, Any] | None:
    job_id = str(raw.get("id") or "").strip()
    title = (raw.get("jobTitle") or "").strip()
    company = (raw.get("companyName") or "").strip()
    url = (raw.get("url") or "").strip()
    if not job_id or not title or not company or not url:
        return None

    location = (raw.get("jobGeo") or "Remote").strip()
    salary_min = raw.get("annualSalaryMin")
    salary_max = raw.get("annualSalaryMax")
    currency = raw.get("salaryCurrency") or "USD"
    salary = ""
    if salary_min and salary_max:
        salary = f"{currency} {int(salary_min):,} - {int(salary_max):,}"
    elif salary_min:
        salary = f"{currency} {int(salary_min):,}"

    industry = raw.get("jobIndustry") or []
    job_type = raw.get("jobType") or []
    if isinstance(industry, str):
        industry = [industry]
    if isinstance(job_type, str):
        job_type = [job_type]
    tags = [str(t).replace("&amp;", "&").strip() for t in (industry + job_type) if str(t).strip()]

    return {
        "id": f"jobicy-{job_id}",
        "source": "Jobicy",
        "title": title,
        "company": company,
        "location": location or "Remote",
        "remote": is_remote_job(location),
        "is_india": is_india_job(location, title),
        "tags": tags[:8],
        "url": url,
        "logo": raw.get("companyLogo") or "",
        "salary": salary,
        "posted": raw.get("pubDate") or "",
        "description": clean_html(raw.get("jobExcerpt") or raw.get("jobDescription") or ""),
    }


def normalize_remotive(raw: dict[str, Any]) -> dict[str, Any] | None:
    job_id = str(raw.get("id") or "").strip()
    title = (raw.get("title") or "").strip()
    company = (raw.get("company_name") or "").strip()
    url = (raw.get("url") or "").strip()
    if not job_id or not title or not company or not url:
        return None

    location = (raw.get("candidate_required_location") or "Worldwide").strip()
    salary = (raw.get("salary") or "").strip()

    category = [raw.get("category")] if raw.get("category") else []
    raw_tags = raw.get("tags") or []
    if isinstance(raw_tags, str):
        raw_tags = [raw_tags]
    tags = [str(t).strip() for t in (category + raw_tags) if str(t).strip()]

    return {
        "id": f"remotive-{job_id}",
        "source": "Remotive",
        "title": title,
        "company": company,
        "location": location or "Worldwide",
        "remote": is_remote_job(location),
        "is_india": is_india_job(location, title),
        "tags": tags[:8],
        "url": url,
        "logo": raw.get("company_logo") or "",
        "salary": salary,
        "posted": raw.get("publication_date") or "",
        "description": clean_html(raw.get("description") or ""),
    }


async def fetch_source_api(
    name: str, url: str, headers: dict[str, str], parser: Any
) -> tuple[str, list[dict[str, Any]], int, int, str | None]:
    last_error = None
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        for attempt in range(MAX_RETRIES):
            try:
                res = await client.get(url, headers=headers)
                res.raise_for_status()
                payload = res.json()
                
                raw_items: list[dict[str, Any]] = []
                if name == "RemoteOK":
                    raw_items = payload[1:] if isinstance(payload, list) else payload.get("jobs", [])
                elif name == "Jobicy":
                    raw_items = payload.get("jobs", []) if isinstance(payload, dict) else []
                elif name == "Remotive":
                    raw_items = payload.get("jobs", []) if isinstance(payload, dict) else []

                fetched_count = len(raw_items)
                valid_jobs: list[dict[str, Any]] = []
                rejected_count = 0
                for item in raw_items:
                    if isinstance(item, dict):
                        normalized = parser(item)
                        if normalized:
                            valid_jobs.append(normalized)
                        else:
                            rejected_count += 1

                return name, valid_jobs, fetched_count, rejected_count, None
            except Exception as exc:
                last_error = str(exc)
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(0.5 * (2**attempt))

    return name, [], 0, 0, last_error or "Fetch failed after max retries"


def deduplicate_jobs(jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen_urls: set[str] = set()
    seen_sigs: set[str] = set()
    unique_jobs: list[dict[str, Any]] = []

    for job in jobs:
        # Standardize URL
        url_clean = re.sub(r"https?://(www\.)?", "", job["url"].lower().rstrip("/"))
        
        # Standardize Signature: company + title + location
        comp_clean = re.sub(r"\W+", "", job["company"].lower())
        title_clean = re.sub(r"\W+", "", job["title"].lower())
        loc_clean = re.sub(r"\W+", "", job["location"].lower())
        sig = f"{comp_clean}:{title_clean}:{loc_clean}"

        if url_clean in seen_urls or sig in seen_sigs:
            continue

        seen_urls.add(url_clean)
        seen_sigs.add(sig)
        unique_jobs.append(job)

    return unique_jobs


async def sync_jobs() -> None:
    state["last_attempt"] = datetime.now(timezone.utc).isoformat()
    state["last_error"] = None

    headers = {"User-Agent": "Signal-Job-Ingestion/2.5 (multi-source challenge demo)"}

    results = await asyncio.gather(
        fetch_source_api("RemoteOK", REMOTEOK_URL, headers, normalize_remoteok),
        fetch_source_api("Jobicy", JOBICY_URL, headers, normalize_jobicy),
        fetch_source_api("Remotive", REMOTIVE_URL, headers, normalize_remotive),
        return_exceptions=True,
    )

    all_valid_jobs: list[dict[str, Any]] = []
    total_fetched = 0
    total_rejected = 0
    sources_status: dict[str, str] = {}
    by_source_counts: dict[str, int] = {"RemoteOK": 0, "Jobicy": 0, "Remotive": 0}
    failed_sources: list[str] = []

    for res in results:
        if isinstance(res, Exception):
            continue
        name, valid_jobs, fetched_count, rejected_count, err = res
        total_fetched += fetched_count
        total_rejected += rejected_count

        if err is None:
            sources_status[name] = "healthy"
            by_source_counts[name] = len(valid_jobs)
            all_valid_jobs.extend(valid_jobs)
        else:
            sources_status[name] = "degraded"
            failed_sources.append(f"{name}: {err}")

    deduped = deduplicate_jobs(all_valid_jobs)

    if deduped:
        state["jobs"] = deduped
        state["mode"] = "live"
        state["status"] = "healthy" if not failed_sources else "degraded"
        state["last_success"] = datetime.now(timezone.utc).isoformat()
        if failed_sources:
            state["last_error"] = "; ".join(failed_sources)
    else:
        # Fallback mode if no live jobs could be fetched from any provider
        state["status"] = "degraded"
        state["mode"] = "fallback"
        state["last_error"] = "; ".join(failed_sources) if failed_sources else "All job sources returned 0 records"
        if not state["jobs"] or all(j.get("source") == "Local fallback" for j in state["jobs"]):
            state["jobs"] = FALLBACK_JOBS
            by_source_counts = {"Local fallback": len(FALLBACK_JOBS)}

    # Recalculate metrics
    india_count = sum(1 for j in state["jobs"] if j.get("is_india"))
    remote_count = sum(1 for j in state["jobs"] if j.get("remote"))

    state.update(
        fetched=total_fetched,
        accepted=len(all_valid_jobs),
        rejected=total_rejected,
        stored=len(state["jobs"]),
        sources=sources_status,
        by_source=by_source_counts,
        india_jobs=india_count,
        remote_jobs=remote_count,
    )


@app.on_event("startup")
async def startup() -> None:
    await sync_jobs()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": state["status"],
        "mode": state["mode"],
        "sources": state["sources"],
        "last_attempt": state["last_attempt"],
        "last_success": state["last_success"],
        "last_error": state["last_error"],
    }


@app.get("/api/stats")
async def stats() -> dict[str, Any]:
    return {
        "fetched": state["fetched"],
        "accepted": state["accepted"],
        "rejected": state["rejected"],
        "stored": state["stored"],
        "sources": len([s for s, st in state["sources"].items() if st == "healthy"]),
        "by_source": state["by_source"],
        "india_jobs": state["india_jobs"],
        "remote_jobs": state["remote_jobs"],
    }


@app.post("/api/sync")
async def sync() -> dict[str, Any]:
    await sync_jobs()
    return await health()


@app.get("/api/jobs")
async def get_jobs(
    q: str | None = Query(default=None, description="Search query"),
    tags: str | None = Query(default=None, description="Comma-separated tags"),
    source: str | None = Query(default=None, description="Source filter (RemoteOK, Jobicy, Remotive)"),
    location: str | None = Query(default=None, description="Location filter (India, Remote, Global, All)"),
    limit: int = Query(default=200, ge=1, le=500),
) -> dict[str, Any]:
    results = list(state["jobs"])

    # Source filter
    if source and source.lower() != "all" and source.lower() != "all sources":
        s_wanted = source.lower().strip()
        results = [j for j in results if j.get("source", "").lower() == s_wanted]

    # Location filter
    if location and location.lower() != "all":
        loc_wanted = location.lower().strip()
        if loc_wanted == "india":
            results = [j for j in results if j.get("is_india")]
        elif loc_wanted == "remote":
            results = [j for j in results if j.get("remote")]
        elif loc_wanted == "global":
            results = [
                j for j in results
                if any(w in j.get("location", "").lower() for w in ["worldwide", "global", "anywhere"])
            ]

    # Tag filter
    if tags:
        wanted_tags = {t.strip().lower() for t in tags.split(",") if t.strip()}
        results = [
            j for j in results
            if wanted_tags & {t.lower() for t in j.get("tags", [])}
        ]

    # Query search
    if q:
        needle = q.lower().strip()
        results = [
            j for j in results
            if needle in j.get("title", "").lower()
            or needle in j.get("company", "").lower()
            or needle in j.get("location", "").lower()
            or needle in j.get("description", "").lower()
            or any(needle in t.lower() for t in j.get("tags", []))
        ]

    sliced = results[:limit]
    return {
        "count": len(sliced),
        "total": len(results),
        "jobs": sliced,
    }
