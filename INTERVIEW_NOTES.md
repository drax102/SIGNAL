# Interview Notes

## One-line explanation
Signal fetches public job data, cleans it into one consistent shape, handles temporary upstream failures with bounded retries, and serves the result to a React dashboard.

## Why a public API?
The challenge explicitly allows a public job-board RSS/API or controlled sandbox for the live demo. I wanted to demonstrate the pipeline without interacting with a protected live account.

## Why normalize?
Different sources use different field names and shapes. Normalization gives the frontend one predictable `Job` schema.

## Why validate?
A broken record should not reach the UI or replace a good dataset.

## Why retry?
Transient network errors and rate limits can happen. Three bounded attempts with increasing delays are enough for this small demo without becoming an aggressive client.

## What happens after retries fail?
The service enters explicit degraded/fallback mode. If a previous valid dataset exists it stays visible; on a first-start failure, a tiny labelled demo dataset keeps the UI usable.

## What would you improve with a week?
Use durable storage, scheduled syncs, per-source adapters, sync-history metrics and a background worker.

## Why not LinkedIn?
The challenge says not to use a live LinkedIn account and provides a low-risk public-source path. I respect that boundary.
