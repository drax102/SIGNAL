"""Signal - small, explainable job-ingestion service."""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

REMOTEOK_URL = os.getenv("JOB_SOURCE_URL", "https://remoteok.com/api")
MAX_RETRIES = 3
REQUEST_TIMEOUT = 12.0

app = FastAPI(title="Signal API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

state: dict[str, Any] = {
    "status": "not_synced",
    "last_attempt": None,
    "last_success": None,
    "last_error": None,
    "fetched": 0,
    "accepted": 0,
    "rejected": 0,
    "source": "RemoteOK public JSON API",
    "mode": "live",
    "jobs": [],
}

# Clearly-labelled local fallback. It keeps the UI demonstrable if the public
# source is temporarily unavailable. The dashboard exposes fallback mode.
FALLBACK_JOBS = [
    {
        "id": "demo-1",
        "title": "Frontend Engineer (Demo)",
        "company": "Signal Demo",
        "location": "Remote",
        "tags": ["React", "TypeScript"],
        "url": "https://remoteok.com/",
        "logo": "",
        "salary": "",
        "posted": datetime.now(timezone.utc).isoformat(),
        "source": "Local fallback",
    },
    {
        "id": "demo-2",
        "title": "Python Developer (Demo)",
        "company": "Signal Demo",
        "location": "Worldwide",
        "tags": ["Python", "FastAPI"],
        "url": "https://remoteok.com/",
        "logo": "",
        "salary": "",
        "posted": datetime.now(timezone.utc).isoformat(),
        "source": "Local fallback",
    },
]


def normalize(job: dict[str, Any]) -> dict[str, Any] | None:
    job_id = job.get("id")
    title = (job.get("position") or "").strip()
    company = (job.get("company") or "").strip()
    url = (job.get("url") or "").strip()
    if not job_id or not title or not company or not url:
        return None
    return {
        "id": job_id,
        "title": title,
        "company": company,
        "location": (job.get("location") or "Remote").strip(),
        "tags": [str(x) for x in (job.get("tags") or [])[:8]],
        "url": url,
        "logo": job.get("company_logo") or "",
        "salary": job.get("salary") or "",
        "posted": job.get("date") or "",
        "source": "RemoteOK",
    }


async def fetch_source() -> tuple[list[dict[str, Any]], int]:
    headers = {"User-Agent": "Signal-Job-Ingestion/2.0 (challenge demo)"}
    last_error = "Unknown upstream error"
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        for attempt in range(MAX_RETRIES):
            try:
                response = await client.get(REMOTEOK_URL, headers=headers)
                response.raise_for_status()
                payload = response.json()
                raw = payload[1:] if isinstance(payload, list) else payload.get("jobs", [])
                jobs = [item for item in (raw or []) if isinstance(item, dict)]
                return jobs, len(raw or [])
            except (httpx.HTTPError, ValueError) as exc:
                last_error = str(exc)
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(0.6 * (2**attempt))
    raise RuntimeError(last_error)


def dedupe(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        key = str(item["id"])
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


async def sync_jobs() -> None:
    state["last_attempt"] = datetime.now(timezone.utc).isoformat()
    state["last_error"] = None
    try:
        raw, fetched = await fetch_source()
        normalized = []
        rejected = 0
        for item in raw:
            parsed = normalize(item)
            if parsed:
                normalized.append(parsed)
            else:
                rejected += 1
        normalized = dedupe(normalized)
        if not normalized:
            raise RuntimeError("Source returned no valid job records")
        state.update(
            status="healthy",
            mode="live",
            fetched=fetched,
            accepted=len(normalized),
            rejected=rejected,
            last_success=datetime.now(timezone.utc).isoformat(),
            jobs=normalized,
        )
    except Exception as exc:  # noqa: BLE001 - intentionally fail closed to fallback
        state["last_error"] = str(exc)
        state["status"] = "degraded"
        state["mode"] = "fallback"
        if not state["jobs"] or all(j.get("source") == "Local fallback" for j in state["jobs"]):
            state["jobs"] = FALLBACK_JOBS
            state["fetched"] = 0
            state["accepted"] = len(FALLBACK_JOBS)
            state["rejected"] = 0


@app.on_event("startup")
async def startup() -> None:
    await sync_jobs()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": state["status"],
        "mode": state["mode"],
        "source": state["source"],
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
        "stored": len(state["jobs"]),
    }


@app.post("/api/sync")
async def sync() -> dict[str, Any]:
    await sync_jobs()
    return await health()


@app.get("/api/jobs")
async def jobs(
    q: str | None = Query(default=None, description="Search title, company, location"),
    tags: str | None = Query(default=None, description="Comma-separated tags"),
    limit: int = Query(default=60, ge=1, le=200),
) -> dict[str, Any]:
    results = list(state["jobs"])
    if q:
        needle = q.lower().strip()
        results = [
            item
            for item in results
            if needle in item["title"].lower()
            or needle in item["company"].lower()
            or needle in item["location"].lower()
        ]
    if tags:
        wanted = {t.strip().lower() for t in tags.split(",") if t.strip()}
        results = [item for item in results if wanted & {t.lower() for t in item["tags"]}]
    return {"count": len(results[:limit]), "jobs": results[:limit]}
