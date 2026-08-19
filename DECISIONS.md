# DECISIONS.md

## 1. Why this ingestion strategy?

I chose a low-risk public JSON job feed instead of browser automation against protected job boards. It demonstrates the actual ingestion concerns the challenge asks for—fetching, validation, normalization, deduplication, retries and failure handling—without crossing a platform's access-control or terms-of-service boundary.

## 2. Trade-off

I kept persistence and scheduling deliberately small for the time limit: the service keeps the latest valid dataset in process memory. With a real week, I would add durable storage, a scheduled worker, source-specific adapters and metrics/history for each sync run.

## 3. AI usage

AI was used to accelerate scaffolding, code review and UI iteration. I personally verified the data flow, API contracts, retry/fallback behavior, validation rules, and the final responsive UI before submission.
