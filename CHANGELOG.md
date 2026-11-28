## Unreleased

- Draw each run before a retry in the timeline on the thread it records (`threadId` on `retryAttempts` entries, from CTRF 0.3.0), falling back to its test's thread.

## 1.4.0 - 2026-11-21

- Add the `timeline-report` input: a Mermaid Gantt chart of when each test ran on each thread or worker, with per-thread busy and idle time and a table of test timings.
- Honor proxy and bypass environment variables for GitHub API calls, including authenticated CONNECT proxies and artifact redirects.

- Preserve nested IDs, input specification versions and run-level errors during merge/grouping; renew derived report IDs and record direct source provenance while retaining existing name-based historical test matching.
- Update CTRF to 0.6.0 for specification 0.3.0 and refresh AI, JUnit, Teams and Handlebars integrations, dependencies and tooling.
- Bundle all CTRF schemas and retain compatibility with legacy report inputs.
