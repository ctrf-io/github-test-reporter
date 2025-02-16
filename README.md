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

Checkout the built-in reports [here](docs/report-showcase.md)

## Table of Contents

1. [Usage](#usage)
2. [Available Inputs](#available-inputs)
3. [Pull Requests](#pull-requests)
4. [Commenting Test Results on Forked Pull Requests](#commenting-test-results-on-forked-pull-requests)
5. [Build Your Own Report](#build-your-own-report)
6. [Community Reports](#community-reports)
7. [GitHub Token](#github-token)
8. [Storing Artifacts](#storing-artifacts)
9. [Filtering](#filtering)
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
    test-report: false
    test-list-report: false
    failed-report: false
    fail-rate-report: false
    flaky-report: false
    flaky-rate-report: false
    failed-folded-report: false
    previous-results-report: false
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

### Comment Management Inputs

`--update-comment` An existing tagged comment is found, the new report is
appended to it. Otherwise, a new comment is created.

`--overwrite-comment` An existing tagged comment is found, that comment’s entire
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
## Commenting Test Results on Forked Pull Requests
GitHub restricts workflows triggered by `pull_request` events from writing to the base repository when PRs originate from forks. This limitation prevents workflows from commenting on pull requests directly.

Using `pull_request_target` instead of `pull_request` allows commenting on forked PRs, but it introduces a significant security risk: the workflow runs with write permissions on the base repository, making it vulnerable to malicious code execution. Attackers could potentially modify workflows to exfiltrate secrets, overwrite critical repository files, or introduce malicious changes that could be merged unnoticed.

To mitigate this, we split the workflow into two:

- **The first workflow (`workflowA`)** runs tests and uploads the results as artifacts.
- **The second workflow (`workflowB`)** is triggered when the first workflow completes and runs in the base repository’s context, allowing it to post a comment securely.

This method ensures that test results are always accessible while maintaining security.

---

### 🔐 Why Use Two Workflows?

GitHub restricts workflows triggered by `pull_request` events from writing to the base repository when PRs originate from forks. This limitation prevents workflows from commenting on pull requests directly.

Using `pull_request_target` instead of `pull_request` allows commenting on forked PRs, but it introduces a significant security risk: the workflow runs with write permissions on the base repository, making it vulnerable to malicious code execution. Attackers could potentially modify workflows to exfiltrate secrets, overwrite critical repository files, or introduce malicious changes that could be merged unnoticed.

To mitigate this, we split the workflow into two:

- **The first workflow (`workflowA`)** runs tests and uploads the results as artifacts.
- **The second workflow (`workflowB`)** is triggered when the first workflow completes and runs in the base repository’s context, allowing it to post a comment securely.This step is triggered by `workflow_run` and since workflow_run does not inherit permissions from the pull request, it eliminates security issues while allowing it to post a comment securely.

This method ensures that test results are always accessible while maintaining security.

---

### 🔄 Step-by-Step Workflow Execution

#### **1️⃣ workflowA: Running Tests and Uploading Artifacts**

This workflow is triggered when a pull request is opened, synchronized, or reopened on any branch. It performs the following steps:

- **Check out PR code**:

```yaml
- name: Check out PR code
  uses: actions/checkout@v4
```

- **Run Tests**:

```yaml
- name: Run Tests
  run: |
    ./run-tests.sh  # Replace with your actual test command
```

- **Convert Test Results to a Compatible Format**:

```yaml
- name: Convert Test Results
  run: |
    npx test-result-converter ./testReport.xml -o ./results/test-report.json  # Modify based on your test framework
```

- **Upload Test Report Artifact**:

```yaml
- name: Upload Test Report Artifact
  uses: actions/upload-artifact@v4
  with:
    name: testReport
    path: ./results/test-report.json
```

- **Save PR Number and Upload as an Artifact**:

To ensure that `workflowB` can correctly comment on the corresponding pull request, we save the PR number as an artifact in `workflowA`. Since `workflowB` is triggered by `workflowA` using `workflow_run`, it does not have direct access to the PR metadata. Uploading the PR number as an artifact allows `workflowB` to retrieve and use it for posting test results in the correct pull request.

```yaml
- name: Save PR Number
  run: echo "PR_NUMBER=${{ github.event.pull_request.number }}" >> $GITHUB_ENV

- name: Upload PR Number as Artifact
  run: echo $PR_NUMBER > pr_number.txt
  shell: bash

- name: Upload PR Number Artifact
  uses: actions/upload-artifact@v4
  with:
    name: pr_number
    path: pr_number.txt
```

Since this workflow only requires read permissions, it avoids potential security risks when dealing with external contributions from forked repositories. The second workflow, which has the necessary permissions to write, is responsible for retrieving and posting the results, ensuring a secure and controlled execution process.

---

#### **2️⃣ workflowB: Downloading Artifacts and Posting Results**

This workflow is triggered when `workflowA` completes successfully. 

- **Download Test Report Artifact**:
Since GitHub Actions does not allow direct artifact downloads across workflows using `actions/download-artifact`, we use `dawidd6/action-download-artifact@v8` instead. This repository enables downloading artifacts from a previous workflow run by specifying the `run_id`, which is essential when handling artifacts between separate workflows. It follows these steps:

```yaml
- name: Download Test Report Artifact
  uses: dawidd6/action-download-artifact@v8
  with:
    name: testReport
    run_id: ${{ github.event.workflow_run.id }}
    path: artifacts
```

- **Download PR Number Artifact**:

```yaml
- name: Download PR Number Artifact
  uses: dawidd6/action-download-artifact@v8
  with:
    name: pr_number
    run_id: ${{ github.event.workflow_run.id }}
    path: pr_number
```

- **Read PR Number**:

```yaml
- name: Read PR Number
  id: read_pr_number
  run: |
    PR_NUMBER=$(cat pr_number/pr_number.txt)
    echo "PR_NUMBER=$PR_NUMBER" >> $GITHUB_ENV
```

- **Publish Test Report**:
  Use `issue:` to input PR number which is downloaded from the artifacts.
```yaml
- name: Publish Test Report
  uses: test-reporter/github-test-reporter@v1.0.6
  with:
    report-path: 'artifacts/test-report.json'          
    issue: ${{ env.PR_NUMBER }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
This method ensures that test results are reliably posted while maintaining a secure GitHub Actions setup. Additionally, this approach scales effectively for large repositories with many PRs, as the artifact-based workflow minimizes redundant computations and ensures efficient resource utilization. 


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

`previous-results-report`, `flaky-rate-report` and `fail-rate-report` need a
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

## Generating an AI Report

You can generate human-readable AI report for your failed tests using models
from the leading AI providers by using the
[AI Test Reporter](https://github.com/ctrf-io/ai-test-reporter)

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
