## Unreleased

- Add the `timeline-report` input: a Mermaid Gantt chart of when each test ran on each thread or worker, with per-thread busy and idle time and a table of test timings.
- Honor proxy and bypass environment variables for GitHub API calls, including authenticated CONNECT proxies and artifact redirects.

- Preserve nested IDs during merge/grouping and renew derived report IDs; retain existing name-based historical test matching.
- Update CTRF to 0.5.0 and refresh AI, JUnit, Teams and Handlebars integrations, dependencies and tooling.
- Bundle all CTRF schemas and retain compatibility with legacy report inputs.
