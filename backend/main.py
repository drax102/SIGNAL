"""
Signal - Multi-Source Job Ingestion Platform.
FastAPI service with isolated adapters, resilience, deduplication, and per-source observability.
"""
from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.adapters import (
    RemoteOKAdapter,
    JobicyAdapter,
    RemotiveAdapter,
    BaseSourceAdapter,
)

REMOTEOK_URL = os.getenv("REMOTEOK_URL", "https://remoteok.com/api")
JOBICY_URL = os.getenv("JOBICY_URL", "https://jobicy.com/api/v2/remote-jobs?count=100")
REMOTIVE_URL = os.getenv("REMOTIVE_URL", "https://remotive.com/api/remote-jobs")

MAX_RETRIES = 3
REQUEST_TIMEOUT = 12.0

app = FastAPI(title="Signal API", version="3.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

adapters: list[BaseSourceAdapter] = [
    RemoteOKAdapter(REMOTEOK_URL),
    JobicyAdapter(JOBICY_URL),
    RemotiveAdapter(REMOTIVE_URL),
]

# Per-source observability state
source_metrics: dict[str, dict[str, Any]] = {
    "RemoteOK": {
        "source": "RemoteOK",
        "status": "not_synced",
        "fetched": 0,
        "accepted": 0,
        "rejected": 0,
        "duplicates": 0,
        "last_attempt": None,
        "last_success": None,
        "last_error": None,
    },
    "Jobicy": {
        "source": "Jobicy",
        "status": "not_synced",
        "fetched": 0,
        "accepted": 0,
        "rejected": 0,
        "duplicates": 0,
        "last_attempt": None,
        "last_success": None,
        "last_error": None,
    },
    "Remotive": {
        "source": "Remotive",
        "status": "not_synced",
        "fetched": 0,
        "accepted": 0,
        "rejected": 0,
        "duplicates": 0,
        "last_attempt": None,
        "last_success": None,
        "last_error": None,
    },
}

# Failure Simulation Flag for Live Demos
simulated_failures: dict[str, str] = {}

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
    "by_source": {"RemoteOK": 0, "Jobicy": 0, "Remotive": 0},
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
        "category": "Engineering",
        "employment_type": "Full-time",
        "skills": ["React", "TypeScript", "Tailwind CSS", "REST API"],
        "tags": ["React", "TypeScript", "Tailwind CSS", "REST API"],
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
        "category": "Engineering",
        "employment_type": "Full-time",
        "skills": ["Python", "FastAPI", "Docker", "PostgreSQL", "AWS"],
        "tags": ["Python", "FastAPI", "Docker", "PostgreSQL", "AWS"],
        "url": "https://remotive.com/",
        "logo": "",
        "salary": "$100,000 - $140,000",
        "posted": datetime.now(timezone.utc).isoformat(),
        "description": "Fallback dataset job listing for demonstration when upstream sources are unreachable.",
    },
]


async def fetch_and_process_adapter(
    adapter: BaseSourceAdapter, headers: dict[str, str]
) -> tuple[str, list[dict[str, Any]], int, int, str | None]:
    name = adapter.name
    now_iso = datetime.now(timezone.utc).isoformat()
    source_metrics[name]["last_attempt"] = now_iso

    # Handle Simulated Failure for Demos
    if name in simulated_failures:
        sim_type = simulated_failures[name]
        source_metrics[name]["status"] = "degraded"
        source_metrics[name]["last_error"] = f"Simulated failure ({sim_type})"
        if sim_type == "timeout":
            await asyncio.sleep(0.5)
            return name, [], 0, 0, f"Simulated Timeout ({name})"
        elif sim_type == "http_error":
            return name, [], 0, 0, f"Simulated 500 Server Error ({name})"
        elif sim_type == "empty":
            return name, [], 0, 0, None  # Empty list response
        elif sim_type == "malformed":
            # Return 5 malformed records to demonstrate rejection
            return name, [], 5, 5, "Simulated malformed payload"

    last_error = None
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        for attempt in range(MAX_RETRIES):
            try:
                raw_items = await adapter.fetch_raw(client, headers)
                fetched_count = len(raw_items)
                valid_jobs: list[dict[str, Any]] = []
                rejected_count = 0

                for item in raw_items:
                    if not isinstance(item, dict):
                        rejected_count += 1
                        continue
                    normalized = adapter.normalize_item(item)
                    if adapter.validate_item(normalized):
                        valid_jobs.append(normalized)
                    else:
                        rejected_count += 1

                source_metrics[name].update(
                    status="healthy",
                    fetched=fetched_count,
                    accepted=len(valid_jobs),
                    rejected=rejected_count,
                    last_success=now_iso,
                    last_error=None,
                )

                return name, valid_jobs, fetched_count, rejected_count, None
            except Exception as exc:
                last_error = str(exc)
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(0.5 * (2**attempt))

    source_metrics[name].update(
        status="degraded",
        fetched=0,
        accepted=0,
        rejected=0,
        last_error=last_error or "Fetch failed after max retries",
    )
    return name, [], 0, 0, last_error or "Fetch failed after max retries"


def deduplicate_jobs(jobs: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
    seen_urls: set[str] = set()
    seen_sigs: set[str] = set()
    unique_jobs: list[dict[str, Any]] = []
    dup_counts: dict[str, int] = {"RemoteOK": 0, "Jobicy": 0, "Remotive": 0}

    for job in jobs:
        src = job.get("source", "Unknown")
        url_clean = re.sub(r"https?://(www\.)?", "", job["url"].lower().rstrip("/"))
        comp_clean = re.sub(r"\W+", "", job["company"].lower())
        title_clean = re.sub(r"\W+", "", job["title"].lower())
        loc_clean = re.sub(r"\W+", "", job["location"].lower())
        sig = f"{comp_clean}:{title_clean}:{loc_clean}"

        if url_clean in seen_urls or sig in seen_sigs:
            if src in dup_counts:
                dup_counts[src] += 1
            continue

        seen_urls.add(url_clean)
        seen_sigs.add(sig)
        unique_jobs.append(job)

    return unique_jobs, dup_counts


async def sync_jobs() -> None:
    state["last_attempt"] = datetime.now(timezone.utc).isoformat()
    state["last_error"] = None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Signal-Job-Ingestion/3.2)"
    }

    tasks = [fetch_and_process_adapter(adapter, headers) for adapter in adapters]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_valid_jobs: list[dict[str, Any]] = []
    total_fetched = 0
    total_rejected = 0
    by_source_counts: dict[str, int] = {"RemoteOK": 0, "Jobicy": 0, "Remotive": 0}
    failed_sources: list[str] = []

    for res in results:
        if isinstance(res, Exception):
            continue
        name, valid_jobs, fetched_count, rejected_count, err = res
        total_fetched += fetched_count
        total_rejected += rejected_count

        if err is None and valid_jobs:
            by_source_counts[name] = len(valid_jobs)
            all_valid_jobs.extend(valid_jobs)
        else:
            if err:
                failed_sources.append(f"{name}: {err}")

    deduped, dup_counts = deduplicate_jobs(all_valid_jobs)

    for src_name, dup_cnt in dup_counts.items():
        if src_name in source_metrics:
            source_metrics[src_name]["duplicates"] = dup_cnt

    if deduped:
        state["jobs"] = deduped
        state["mode"] = "live"
        state["status"] = "healthy" if not failed_sources else "degraded"
        state["last_success"] = datetime.now(timezone.utc).isoformat()
        if failed_sources:
            state["last_error"] = "; ".join(failed_sources)
    else:
        state["status"] = "degraded"
        state["mode"] = "fallback"
        state["last_error"] = "; ".join(failed_sources) if failed_sources else "All job sources returned 0 records"
        if not state["jobs"] or all(j.get("source") == "Local fallback" for j in state["jobs"]):
            state["jobs"] = FALLBACK_JOBS
            by_source_counts = {"Local fallback": len(FALLBACK_JOBS)}

    india_count = sum(1 for j in state["jobs"] if j.get("is_india"))
    remote_count = sum(1 for j in state["jobs"] if j.get("remote"))

    state.update(
        fetched=total_fetched,
        accepted=len(all_valid_jobs),
        rejected=total_rejected,
        stored=len(state["jobs"]),
        by_source=by_source_counts,
        india_jobs=india_count,
        remote_jobs=remote_count,
    )


@app.on_event("startup")
async def startup() -> None:
    await sync_jobs()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    sources_summary = {k: v["status"] for k, v in source_metrics.items()}
    return {
        "status": state["status"],
        "mode": state["mode"],
        "sources": sources_summary,
        "last_attempt": state["last_attempt"],
        "last_success": state["last_success"],
        "last_error": state["last_error"],
    }


@app.get("/api/sources")
async def get_sources() -> dict[str, Any]:
    """Return detailed per-source metrics for observability and UI pipeline flow."""
    return {
        "sources": list(source_metrics.values()),
        "overall_status": state["status"],
        "last_sync": state["last_success"] or state["last_attempt"],
    }


@app.get("/api/stats")
async def stats() -> dict[str, Any]:
    return {
        "fetched": state["fetched"],
        "accepted": state["accepted"],
        "rejected": state["rejected"],
        "stored": state["stored"],
        "sources": len([s for s, m in source_metrics.items() if m["status"] == "healthy"]),
        "by_source": state["by_source"],
        "india_jobs": state["india_jobs"],
        "remote_jobs": state["remote_jobs"],
    }


@app.post("/api/sync")
async def sync() -> dict[str, Any]:
    await sync_jobs()
    return await health()


@app.post("/api/test/simulate-failure")
async def simulate_failure(
    source: str = Query(..., description="Source name to simulate (RemoteOK, Jobicy, Remotive)"),
    type: str = Query("timeout", description="Failure type (timeout, http_error, empty, malformed, reset)"),
) -> dict[str, Any]:
    """Development/Test endpoint to simulate source failures for live interview demos."""
    if os.getenv("ENVIRONMENT") == "production" and os.getenv("ALLOW_TEST_SIMULATION", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Failure simulation disabled in production")

    valid_sources = ["RemoteOK", "Jobicy", "Remotive"]
    if source not in valid_sources:
        raise HTTPException(status_code=400, detail=f"Source must be one of {valid_sources}")

    if type == "reset":
        simulated_failures.pop(source, None)
    else:
        simulated_failures[source] = type

    await sync_jobs()
    return {
        "message": f"Simulation updated for {source}: {type}",
        "simulated_failures": simulated_failures,
        "health": await health(),
    }


@app.get("/api/jobs")
async def get_jobs(
    q: str | None = Query(default=None, description="Search query across title, company, location, skills, category, description"),
    tags: str | None = Query(default=None, description="Comma-separated tags or skills"),
    source: str | None = Query(default=None, description="Source filter (RemoteOK, Jobicy, Remotive)"),
    location: str | None = Query(default=None, description="Location filter (India, Remote, Global, All)"),
    category: str | None = Query(default=None, description="Category filter (Engineering, Data, DevOps / Cloud, Design, Marketing, Sales, Support, Security, Product, Finance, All)"),
    limit: int = Query(default=200, ge=1, le=500),
) -> dict[str, Any]:
    results = list(state["jobs"])

    # Source filter
    if source and source.lower() not in ["all", "all sources"]:
        s_wanted = source.lower().strip()
        results = [j for j in results if j.get("source", "").lower() == s_wanted]

    # Location filter
    if location and location.lower() not in ["all", "all jobs"]:
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

    # Category filter
    if category and category.lower() != "all":
        cat_wanted = category.lower().strip()
        results = [
            j for j in results
            if cat_wanted in j.get("category", "").lower()
        ]

    # Tag / Skill filter
    if tags:
        wanted_tags = {t.strip().lower() for t in tags.split(",") if t.strip()}
        results = [
            j for j in results
            if wanted_tags & {s.lower() for s in j.get("skills", []) + j.get("tags", [])}
        ]

    # Search filter
    if q:
        needle = q.lower().strip()
        results = [
            j for j in results
            if needle in j.get("title", "").lower()
            or needle in j.get("company", "").lower()
            or needle in j.get("location", "").lower()
            or needle in j.get("description", "").lower()
            or needle in j.get("category", "").lower()
            or any(needle in s.lower() for s in j.get("skills", []) + j.get("tags", []))
        ]

    sliced = results[:limit]
    return {
        "count": len(sliced),
        "total": len(results),
        "jobs": sliced,
    }
