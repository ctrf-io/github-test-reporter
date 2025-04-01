# Customizing Report Order

The GitHub Test Reporter allows you to customize the order in which reports appear in your job summary or pull request comments. This feature gives you complete control over how your test results are presented, making it easier to prioritize the most important information for your team.

## Basic Usage

To customize the order of reports, use the `report-order` parameter with a comma-separated list of report types:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    summary-report: true
    failed-report: true
    flaky-report: true
    insights-report: true
    test-report: true
    # Order reports with the most important information first
    report-order: 'summary-report,failed-report,flaky-report,insights-report,test-report'
  if: always()
```

## Default Order

If you don't specify a custom order using the `report-order` parameter, the reports will be displayed in the following default order:

1. Summary report (`summary-report`)
2. GitHub report (`github-report`)
3. Previous results report (`previous-results-report`)
4. Insights report (`insights-report`)
5. Failed tests report (`failed-report`)
6. Fail rate report (`fail-rate-report`)
7. Failed folded report (`failed-folded-report`)
8. Flaky tests report (`flaky-report`)
9. Flaky rate report (`flaky-rate-report`)
10. Skipped tests report (`skipped-report`)
11. AI analysis report (`ai-report`)
12. Pull request report (`pull-request-report`)
13. Commit report (`commit-report`)
14. Slowest tests report (`slowest-report`)
15. Custom report (`custom-report`)
16. Community report (`community-report`)
17. Tests table report (`test-report`)
18. Tests list report (`test-list-report`)
19. Suite folded report (`suite-folded-report`)
20. Suite list report (`suite-list-report`)

This default order is designed to present the most important information first, starting with summary data and then focusing on failures and issues.

## Available Report Types

The following report types can be included in your custom order:

| Report Type | Description | Input Parameter |
|-------------|-------------|-----------------|
| `summary-report` | Summary report with test statistics | `summary-report` |
| `github-report` | GitHub format test report | `github-report` |
| `failed-report` | Failed tests report | `failed-report` |
| `fail-rate-report` | Fail rate report | `fail-rate-report` |
| `flaky-report` | Flaky tests report | `flaky-report` |
| `flaky-rate-report` | Flaky rate report | `flaky-rate-report` |
| `failed-folded-report` | Failed tests folded report | `failed-folded-report` |
| `previous-results-report` | Previous results report | `previous-results-report` |
| `ai-report` | AI analysis report | `ai-report` |
| `skipped-report` | Skipped tests report | `skipped-report` |
| `test-report` | Tests table report | `test-report` |
| `test-list-report` | Tests list report | `test-list-report` |
| `suite-folded-report` | Suite folded report | `suite-folded-report` |
| `suite-list-report` | Suite list report | `suite-list-report` |
| `pull-request-report` | Pull request report | `pull-request-report` |
| `commit-report` | Commit report | `commit-report` |
| `custom-report` | Custom report | `custom-report` |
| `community-report` | Community report | `community-report` |
| `insights-report` | Insights report | `insights-report` |
| `slowest-report` | Slowest tests report | `slowest-report` |

## Important Notes

1. You must enable each report type using its corresponding input parameter for it to be included in the output, regardless of whether it's in the `report-order` list.

2. If you include a report type in `report-order` that isn't enabled, it will be skipped.

3. If you don't specify a `report-order`, reports will be displayed in the default order listed above.

4. If you specify a `report-order` list but omit some enabled reports, those reports will still be included at the end of the output in their default order. This ensures that all enabled reports are displayed, even if they weren't explicitly included in the `report-order` parameter.

5. Only the reports that are enabled (through their respective input parameters) will be displayed.

## Example: Focus on Failed and Flaky Tests

If you want to focus on failed and flaky tests in your report, you can use:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    summary-report: true
    failed-report: true
    flaky-report: true
    test-report: true
    # Show failed and flaky tests before the full test report
    report-order: 'summary-report,failed-report,flaky-report,test-report'
  if: always()
```

## Example: Put Insights First

If you have insights or AI analysis that you want to highlight at the top of your report:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    summary-report: true
    insights-report: true
    ai-report: true
    failed-report: true
    # Show insights and AI analysis before other reports
    report-order: 'insights-report,ai-report,summary-report,failed-report'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  if: always()
```

## Using with the CLI

When using the CLI, you can also specify the report order:

```bash
npx github-actions-ctrf summary failed flaky tests ctrf-report.json --report-order "summary-report,failed-report,flaky-report,test-report"
``` 