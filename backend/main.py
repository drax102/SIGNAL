"""Signal - Multi-source job ingestion service with distinct category and skill tags."""
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

app = FastAPI(title="Signal API", version="2.6.0")
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
        "category": "Engineering",
        "employment_type": "Full-time",
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
        "tags": ["Python", "FastAPI", "Docker", "PostgreSQL", "AWS"],
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

NON_SKILL_WORDS = {
    "remote", "worldwide", "full time", "full_time", "part_time", "contract",
    "freelance", "non tech", "non_tech", "senior", "junior", "lead", "manager",
    "entry level", "mid level", "other", "all others", "full-time", "part-time",
    "customer support", "dev", "finance", "admin", "exec", "ops", "medical",
    "digital nomad", "education", "sys admin", "marketing", "sales", "design",
    "legal", "engineering", "human resources", "recruiting", "recruitment",
    "payroll", "accounting", "technical", "biotech"
}

SKILL_CANONICAL_MAP = {
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "python": "Python",
    "fastapi": "FastAPI",
    "aws": "AWS",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "sql": "SQL",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "java": "Java",
    "c++": "C++",
    "cpp": "C++",
    "c#": "C#",
    "golang": "Go",
    "go": "Go",
    "rust": "Rust",
    "figma": "Figma",
    "salesforce": "Salesforce",
    "hubspot": "HubSpot",
    "crm": "CRM",
    "django": "Django",
    "flask": "Flask",
    "graphql": "GraphQL",
    "vue": "Vue.js",
    "angular": "Angular",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "tailwind": "Tailwind CSS",
    "css": "CSS",
    "html": "HTML",
    "git": "Git",
    "github": "GitHub",
    "ci/cd": "CI/CD",
    "gcp": "GCP",
    "azure": "Azure",
    "linux": "Linux",
    "jira": "Jira",
    "b2b": "B2B",
    "seo": "SEO",
    "excel": "Excel",
}

KNOWN_SKILLS_KEYWORDS = list(SKILL_CANONICAL_MAP.values())


def is_india_job(location: str, title: str = "") -> bool:
    text = f"{location or ''} {title or ''}".lower()
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


def classify_category(category_raw: str, title: str, tags: list[str]) -> str:
    title_lower = title.lower()
    cat_lower = (category_raw or "").lower()

    if any(k in title_lower for k in ["engineer", "developer", "software", "frontend", "backend", "fullstack", "devops", "qa", "architect", "programmer", "tech lead"]):
        return "Engineering"
    if any(k in title_lower for k in ["design", "ui", "ux", "graphic", "art", "animator", "creative"]):
        return "Design"
    if any(k in title_lower for k in ["marketing", "seo", "growth", "content", "copywriter", "social media", "brand"]):
        return "Marketing"
    if any(k in title_lower for k in ["sales", "account executive", "business development", "sdr", "account manager"]):
        return "Sales"
    if any(k in title_lower for k in ["support", "customer service", "helpdesk", "patient care", "client success", "customer experience"]):
        return "Support"
    if any(k in title_lower for k in ["data analyst", "data engineer", "data scientist", "analytics", "machine learning", "ai engineer"]):
        return "Data"

    if any(k in cat_lower for k in ["software", "engineering", "dev", "tech"]):
        return "Engineering"
    if "design" in cat_lower:
        return "Design"
    if "marketing" in cat_lower:
        return "Marketing"
    if "sales" in cat_lower:
        return "Sales"
    if "support" in cat_lower or "customer" in cat_lower:
        return "Support"
    if "data" in cat_lower:
        return "Data"

    return "Engineering"


def normalize_employment_type(raw_type: str) -> str:
    if not raw_type:
        return "Full-time"
    t = str(raw_type).lower()
    if "full" in t:
        return "Full-time"
    if "contract" in t:
        return "Contract"
    if "part" in t:
        return "Part-time"
    if "freelance" in t:
        return "Freelance"
    return str(raw_type).strip().title()


def clean_and_normalize_tags(raw_tags: list[str], title: str = "", description: str = "") -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for item in raw_tags:
        clean = str(item).replace("&amp;", "&").strip()
        clean_lower = clean.lower()
        if not clean or clean_lower in NON_SKILL_WORDS or len(clean) > 25:
            continue
        
        canonical = SKILL_CANONICAL_MAP.get(clean_lower, clean.title() if len(clean) <= 15 else clean)
        if canonical.lower() not in seen:
            seen.add(canonical.lower())
            result.append(canonical)

    # Extract explicitly mentioned tech/tool skills from title and description if tags are sparse
    search_text = f"{title} {description[:500]}"
    for skill in KNOWN_SKILLS_KEYWORDS:
        if len(result) >= 6:
            break
        if skill.lower() not in seen:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, search_text, re.IGNORECASE):
                seen.add(skill.lower())
                result.append(skill)

    return result[:6]


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

    raw_tags = [str(x) for x in (raw.get("tags") or []) if str(x).strip()]
    description = clean_html(raw.get("description") or "")
    tags = clean_and_normalize_tags(raw_tags, title, description)
    category = classify_category("", title, tags)

    return {
        "id": f"remoteok-{job_id}",
        "source": "RemoteOK",
        "title": title,
        "company": company,
        "location": location or "Remote",
        "remote": is_remote_job(location),
        "is_india": is_india_job(location, title),
        "category": category,
        "employment_type": "Full-time",
        "tags": tags,
        "url": url,
        "logo": raw.get("company_logo") or raw.get("logo") or "",
        "salary": salary,
        "posted": raw.get("date") or "",
        "description": description,
    }


def normalize_jobicy(raw: dict[str, Any]) -> dict[str, Any] | None:
    job_id = str(raw.get("id") or "").strip()
    title = (raw.get("jobTitle") or "").strip()
    company = (raw.get("companyName") or "").strip()
    url = (raw.get("url") or "").strip()
    if not job_id or not title or not company or not url:
        return None

    location = (raw.get("jobGeo") or "Remote").strip()
    salary_min = raw.get("salaryMin") or raw.get("annualSalaryMin")
    salary_max = raw.get("salaryMax") or raw.get("annualSalaryMax")
    currency = raw.get("salaryCurrency") or "USD"
    salary = ""
    if salary_min and salary_max:
        salary = f"{currency} {int(salary_min):,} - {int(salary_max):,}"
    elif salary_min:
        salary = f"{currency} {int(salary_min):,}"

    industry_list = raw.get("jobIndustry") or []
    if isinstance(industry_list, str):
        industry_list = [industry_list]
    raw_cat = industry_list[0] if industry_list else ""
    category = classify_category(str(raw_cat), title, [])

    type_list = raw.get("jobType") or []
    if isinstance(type_list, str):
        type_list = [type_list]
    raw_type = type_list[0] if type_list else "Full-Time"
    employment_type = normalize_employment_type(str(raw_type))

    description = clean_html(raw.get("jobExcerpt") or raw.get("jobDescription") or "")
    tags = clean_and_normalize_tags([], title, description)

    return {
        "id": f"jobicy-{job_id}",
        "source": "Jobicy",
        "title": title,
        "company": company,
        "location": location or "Remote",
        "remote": is_remote_job(location),
        "is_india": is_india_job(location, title),
        "category": category,
        "employment_type": employment_type,
        "tags": tags,
        "url": url,
        "logo": raw.get("companyLogo") or "",
        "salary": salary,
        "posted": raw.get("pubDate") or "",
        "description": description,
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

    raw_cat = raw.get("category") or ""
    raw_tags = raw.get("tags") or []
    if isinstance(raw_tags, str):
        raw_tags = [raw_tags]

    description = clean_html(raw.get("description") or "")
    tags = clean_and_normalize_tags(raw_tags, title, description)
    category = classify_category(str(raw_cat), title, tags)
    employment_type = normalize_employment_type(raw.get("job_type") or "full_time")

    return {
        "id": f"remotive-{job_id}",
        "source": "Remotive",
        "title": title,
        "company": company,
        "location": location or "Worldwide",
        "remote": is_remote_job(location),
        "is_india": is_india_job(location, title),
        "category": category,
        "employment_type": employment_type,
        "tags": tags,
        "url": url,
        "logo": raw.get("company_logo") or "",
        "salary": salary,
        "posted": raw.get("publication_date") or "",
        "description": description,
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
        url_clean = re.sub(r"https?://(www\.)?", "", job["url"].lower().rstrip("/"))
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

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (Signal-Job-Ingestion/2.6)"
    }

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
    category: str | None = Query(default=None, description="Category filter (Engineering, Design, Marketing, Support, All)"),
    limit: int = Query(default=200, ge=1, le=500),
) -> dict[str, Any]:
    results = list(state["jobs"])

    # Source filter
    if source and source.lower() not in ["all", "all sources"]:
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

    # Category filter
    if category and category.lower() != "all":
        cat_wanted = category.lower().strip()
        results = [
            j for j in results
            if cat_wanted in j.get("category", "").lower()
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
            or needle in j.get("category", "").lower()
            or any(needle in t.lower() for t in j.get("tags", []))
        ]

    sliced = results[:limit]
    return {
        "count": len(sliced),
        "total": len(results),
        "jobs": sliced,
    }
