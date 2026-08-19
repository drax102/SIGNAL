# Architectural & Technical Decisions — SIGNAL (Part 1)

## 1. Why this Ingestion Strategy over the Rejected Alternative?
We chose **direct public API / RSS ingestion** over headless browser scraping (e.g. Playwright/Puppeteer against anti-bot-protected sites like LinkedIn or Indeed). Headless scraping introduces brittle selectors, high memory overhead, CAPTCHA blockage, and violates platform ToS. By ingesting public, structured feeds (RemoteOK, Jobicy, Remotive), we maintain a zero-evasion footprint, sub-second execution, and 100% legal compliance while demonstrating robust data pipeline engineering (normalization, deduplication, validation, and resilience).

## 2. Trade-off Under Time Limit & 1-Week Roadmap
**Trade-off Made**: The in-memory cache and state store is in-process (`backend/main.py`), meaning state resets on application restarts.
**What We Would Do with a Real Week**:
- **Persistence**: Replace in-memory dict with PostgreSQL + Redis for durable storage and async job queuing.
- **Scheduled Background Workers**: Implement Celery/ARQ workers for cron-based background ingestion instead of on-demand sync.
- **Source Expansion**: Add XML/RSS feed parsers and GitHub Jobs/WeWorkRemotely feeds with rate-limit governance.
- **Observability**: Export Prometheus metrics and OpenTelemetry trace spans per source adapter.

## 3. AI Tool Usage & Manual Verification
**AI Assistance**: Used for scaffolding FastAPI boilerplate, TypeScript interfaces, Tailwind styling, and regex pattern compilation.
**What We Personally Verified & Changed**:
- Architected the `BaseSourceAdapter` pattern to isolate provider logic.
- Implemented multi-tier skill extraction (`explicit tags -> description regex -> title regex`) with strict word-boundaries (`\b`) to eliminate false positives (e.g. `Java` vs `JavaScript`, `C` vs `CSS`).
- Built deterministic cross-source deduplication via normalized URL hashing and `(company:title:location)` composite keys.
- Designed the `POST /api/test/simulate-failure` endpoint and verified partial failure resilience under simulated HTTP 500s and timeouts.

---

## 🛡️ Detection Surface, Pacing, Resilience & ToS Boundary

- **Source Detection Surface**: Minimal and transparent. Standard browser `User-Agent` headers (`Signal-Job-Ingestion/3.2`) with clear identity. No fingerprint spoofing, TLS camouflage, or residential proxies.
- **Pacing & Retry Strategy**: Bounded 3-retry limit with exponential backoff (`0.5s * 2^attempt`) and 12s request timeouts using `httpx.AsyncClient`.
- **Resilience Strategy**: `asyncio.gather(..., return_exceptions=True)` ensures single-source outages leave other sources fully functional (`status: "degraded"`).
- **Fallback Strategy**: If all upstream sources fail and no live cache exists, SIGNAL gracefully falls back to a verified local schema demo dataset.
- **ToS Boundary**: Strictly adheres to public API & RSS feed usage guidelines. No CAPTCHA solving, IP rotation, or authentication bypass.
