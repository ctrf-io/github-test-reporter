# Publish and View Test Results Reports in Github Actions

> Integrate Test Reporting into Your GitHub Actions Workflow

A GitHub test reporting tool that supports all major testing frameworks.
Generate, publish and alert your team with detailed test results, including
summaries, in-depth reports, failed test analyses, flaky test detection and AI
analyses directly within your GitHub Actions CI/CD workflow and Pull Requests.

Choose from a variety of pre-built reports or create custom reports tailored to
your project's needs, ensuring that test results are always where you need them.

<div align="center">
<div style="padding: 1.5rem; border-radius: 8px; margin: 1rem 0; border: 1px solid #30363d;">
<span style="font-size: 23px;">💚</span>
<h3 style="margin: 1rem 0;">CTRF tooling is open source and free to use</h3>
<p style="font-size: 16px;">You can support the project with a follow and a star</p>

<div style="margin-top: 1.5rem;">
<a href="https://github.com/ctrf-io/github-test-reporter">
<img src="https://img.shields.io/github/stars/ctrf-io/github-test-reporter?style=for-the-badge&color=2ea043" alt="GitHub stars">
</a>
<a href="https://github.com/ctrf-io">
<img src="https://img.shields.io/github/followers/ctrf-io?style=for-the-badge&color=2ea043" alt="GitHub followers">
</a>
</div>
</div>

<p style="font-size: 14px; margin: 1rem 0;">
Maintained by <a href="https://github.com/ma11hewthomas">Matthew Thomas</a><br/>
Contributions are very welcome! <br/>
Explore more <a href="https://www.ctrf.io/integrations">integrations</a>
</p>
</div>

## Key Features

### 📊 Comprehensive Test Reports

Access powerful built-in reports including:

- 📈 Historical Test Trends
- 📝 Detailed Test Results
- ❌ Failed Tests Overview
- 🔁 Flaky Tests Analysis

### 🎨 Custom Report Builder

Create and customize your own test reports with our flexible templating system.
Perfect for teams with specific reporting needs or unique project requirements.

### 🤖 AI-Powered Test Analysis

Get intelligent insights on test failures with our AI-generated reports. Quickly
understand why tests failed and how to fix them using leading AI models.

### 🔌 Universal Framework Support

Compatible with all major testing frameworks through standardized CTRF reports

## Report Showcase

Checkout all the built-in reports [here](docs/report-showcase.md)

## Visual Overview

|          ![all](images/all.png)          |    ![ai](images/github.png)     | ![flaky-rate](images/insights.png) |    ![historical](images/historical.png)     |         ![pr](images/pr.png)         |
| :--------------------------------------: | :----------------------------------------: | :----------------------------------: | :--------------------------: | :----------------------------------: |
| ![suite-folded](images/suite-folded.png) | ![ai](images/ai.png) |     ![custom](images/custom.png)     | ![failed](images/failed.png) | ![suite-list](images/suite-list.png) |

## Table of Contents

1. [Usage](#usage)
2. [Available Inputs](#available-inputs)
3. [Pull Requests](#pull-requests)
4. [Build Your Own Report](#build-your-own-report)
5. [Community Reports](#community-reports)
6. [GitHub Token](#github-token)
7. [Storing Artifacts](#storing-artifacts)
8. [Filtering](#filtering)
9. [Integrations](#integrations)
10. [Generating an AI Report](#generating-an-ai-report)
11. [Run With NPX](#run-with-npx)
12. [Report Showcase](#report-showcase)
13. [What is CTRF?](#what-is-ctrf)

## Usage

To get started add the following to your workflow file:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
  if: always()
```

This will publish the default reports `summary-report`, `failed-report`,
`flaky-report`, `skipped-report`, and `test-report` to the job summary.

## Generate a CTRF report

[CTRF reporters](https://ctrf.io/integrations) are available for
most testing frameworks and easy to install.

**No CTRF reporter? No problem!**

Use [junit-to-ctrf](https://github.com/ctrf-io/junit-to-ctrf) to convert a JUnit
report to CTRF

## Available Inputs

There are several inputs available

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    # Core Configuration
    report-path: './ctrf/*.json' # Path or glob pattern to the CTRF report JSON file.
    template-path: './templates/custom-summary.hbs' # Path to the Handlebars template for customizing markdown output.

    # Reports - Choose as many as you like. Default is false
    summary-report: true
    github-report: false
    test-report: false
    test-list-report: false
    failed-report: false
    fail-rate-report: false
    flaky-report: false
    flaky-rate-report: false
    failed-folded-report: false
    previous-results-report: false
    insights-report: false
    slowest-report: false
    ai-report: false
    skipped-report: false
    suite-folded-report: false
    suite-list-report: false
    pull-request-report: false
    commit-report: false
    custom-report: false
    community-report: false

    # Behavior Options
    summary: true # Post report to the job summary. Default is true
    pull-request: false # Comment on pull request with report. Default is false
    issue: '' # Issue number to comment on. Works with standard issues and pull-request. Default is no issue
    status-check: false # Create a status check for the workflow. Default is false
    status-check-name: 'Test Reporter Results' # Name of the status check. Default is GitHub Test Reporter Results 
    community-report-name: 'summary-short' # Name of the community report to use. Default is summary-short
    title: '' # Set a custom title to display on the report.
    annotate: true # Add failed test annotations. Default is true
    on-fail-only: false # Add a pull request comment only if tests fail. Default is false
    exit-on-fail: false # Exit the workflow with a failure status if any tests fail. Default is false
    use-suite-name: false # Prefix test names with the suite name for better grouping. Default is false
    update-comment: false # Update existing Pull Request comment. Default is false
    overwrite-comment: false # Overwrite existing Pull Request comment. Default is false
    comment-tag: false # Tag to match Pull Request comment
    write-ctrf-to-file: 'ctrf/ctrf-report.json' # Path to write the processed CTRF report for future processing. Default no write
    upload-artifact: true # Upload to workflow artifact the processed CTRF report for future processing. Default false
    comment-tag: '' # Tag to match Pull Request comment

    # Advanced Options
    artifact-name: 'ctrf-report' # Name of the artifact containing test reports. Default is ctrf-report
    previous-results-max: 10 # Maximum number of previous test results to display in the report. Default is 10
    fetch-previous-results: false # Always fetch previous workflow runs when using custom templates. Default is false
    group-by: 'filePath' # Specify grouping for applicable reports (e.g., suite or file path). Default is filePath
    always-group-by: false # Force grouping by suite or file path for all reports. Default is false
    integrations-config: '{}' # JSON configuration for integrations with other developer tools
  if: always()
```

Only `report-path` is required.

## Pull Requests

You can add a pull request comment by using the `pull-request-report` input:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    pull-request-report: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  if: always()
```

This uses the built-in
[pull request comment report](docs/report-showcase.md#pull-request-report).

Additionally, you can add any report to a pull request comment by adding the
`pull-request` input:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    flaky-rate-report: true
    pull-request: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  if: always()
```

The `pull-request` input works with all reports, including custom.

You can also comment on a specific issue or pull request by using the `issue`
input and providing the issue number ():

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    issue: '123'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  if: always()
```

**Note:** Special considerations apply to pull requests from forks. See [Fork Pull Requests](docs/fork-pull-requests.md) for details.

### Comment Management Inputs

`--update-comment` An existing tagged comment is found, the new report is
appended to it. Otherwise, a new comment is created.

`--overwrite-comment` An existing tagged comment is found, that comment's entire
content is replaced with the new report. Otherwise, a new comment is created.

`--comment-tag` A unique identifier for comments posted. Used to find and
update/overwrite existing comments.

For example, the following command creates or updates a comment tagged with the
current workflow and job names:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    flaky-rate-report: true
    pull-request: true
    update-comment: true
    comment-tag: '${{ github.workflow }}-${{ github.job }}'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  if: always()
```

## Build Your Own Report

The `custom-report` input lets you build your own report using a Handlebars
template. The template can include any markdown content and leverage data from
your CTRF report and GitHub properties, allowing for dynamic and customizable
report.

Add the following to your workflow file:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    template-path: './templates/custom-report.hbs'
    custom-report: true
  if: always()
```

For detailed instructions on building your own report, see the
[documentation](docs/build-your-own-report.md).

For inspiration, check out the [built-in reports](src/reports) and
[community reports](community-reports)

## Community Reports

We welcome and encourage contributions of community-built reports. Community
reports allow users to share custom reports designed for specific use cases.

To submit a community-built report create a Pull Request.

You can see available [community built reports](community-reports)

Add the following to your workflow file:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    community-report: true
    communty-report-name: summary-short
  if: always()
```

## GitHub Token

`previous-results-report`, `insights-report`, `flaky-rate-report`, `fail-rate-report`, and `slowest-report` need a
GITHUB_TOKEN:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    flaky-rate-report: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  if: always()
```

## Storing Artifacts

Some reports require you to store CTRF reports as artifacts, use the
`upload-artifact` input or the `actions/upload-artifact@v4` action:

```yaml
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: ctrf-report
    path: path-to-your-ctrf-report.json
  if: always()
```

## Filtering

`previous-results-report`, `flaky-rate-report` and `fail-rate-report` filter
previous results as follows:

- Runs from the same branch for events of type push, schedule and
  workflow_dispatch from the same workflow id
- Runs from the same pull request for events of type pull_request from the same
  workflow id

This ensures that you only see workflow runs that are related to your current
branch or pull request

## Integrations

CTRF tooling offers seamless developer tool integration, allowing you to combine the GitHub Test Reporter with the following tools:

| Integration | Description | Repository |
|------------|-------------|------------|
| Slack Test Reporter | Send test results and notifications to Slack channels | [ctrf-io/slack-test-reporter](https://github.com/ctrf-io/slack-test-reporter) |
| Microsoft Teams Test Reporter | Post test results and alerts to Teams channels | [ctrf-io/teams-test-reporter](https://github.com/ctrf-io/teams-test-reporter) |
| AI Test Reporter | Intelligent test analysis using leading AI models | [ctrf-io/ai-test-reporter](https://github.com/ctrf-io/ai-test-reporter) |

For detailed information about configuring and using these integrations, see our [Integrations Documentation](docs/integrations.md).

Integrations are currently in beta. Please report any issues to the [GitHub Test Reporter repository](https://github.com/ctrf-io/github-test-reporter/issues).

## Generating an AI Report

You can generate human-readable AI report for your failed tests using models
from the leading AI providers by using the AI Test Reporter integration or the 
[AI Test Reporter](https://github.com/ctrf-io/ai-test-reporter) directly. 

## Run With NPX

You can run using `npx`, see full instructions here

## What is CTRF?

A test results report schema that provides a standardized format for JSON test
reports.

**Consistency Across Tools:** Different testing tools and frameworks often
produce reports in varied formats. CTRF ensures a uniform structure, making it
easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema
that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically
analyzing test outcomes across multiple platforms becomes more straightforward.

## Support Us

If you find this project useful, consider giving it a GitHub star ⭐ It means a
lot to us.