# Safely Commenting on Forked PRs

## Overview

This tutorial explains how to set up a GitHub Actions workflow that runs tests and comments on the results of pull requests (PRs), including those from forks. Using two workflows ensures security while allowing test reports to be posted on all types of PRs.

The setup consists of two workflows:

1. **`workflowA`** - Runs tests and uploads the test results as artifacts.
2. **`workflowB`** - Retrieves test results and comments on the corresponding pull request.

This method is applicable to any project using GitHub Actions for CI/CD, ensuring a secure and efficient way to handle test reporting.

## Why Use Two Workflows?

GitHub restricts workflows triggered by `pull_request` events from writing to the base repository when PRs originate from forks. This limitation prevents workflows from commenting on pull requests directly.

Using `pull_request_target` instead of `pull_request` allows commenting on forked PRs, but it introduces a significant security risk: the workflow runs with write permissions on the base repository, making it vulnerable to malicious code execution. Attackers could potentially modify workflows to exfiltrate secrets, overwrite critical repository files, or introduce malicious changes that could be merged unnoticed.

To mitigate this, we split the workflow into two:

- **The first workflow (********`workflowA`********)** runs tests and uploads the results as artifacts. This workflow is triggered using `pull_request`, ensuring it runs whenever a new pull request is opened, updated, or reopened.
- **The second workflow (********`workflowB`********)** is triggered by `workflow_run` when the first workflow completes. Since `workflow_run` does not inherit permissions from the pull request, it eliminates security issues while allowing it to post a comment securely.

This method ensures that test results are always accessible while maintaining security.

## Step-by-Step Workflow Execution

### **workflowA: Running Tests and Uploading Artifacts**

This workflow is triggered when a pull request is opened, synchronized, or reopened on any branch.

**Complete workflow file (`.github/workflows/test.yml`):**

```yaml
name: Run Tests

on:
  pull_request:
    branches: ['**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Check out PR code
        uses: actions/checkout@v4
      
      - name: Run Tests
        run: |
          ./run-tests.sh  # Replace with your actual test command
      
      - name: Upload Test Report Artifact
        uses: actions/upload-artifact@v4
        with:
          name: testReport
          path: ./results/ctrf-report.json
```

Since this workflow only requires read permissions, it avoids potential security risks when dealing with external contributions from forked repositories. The second workflow, which has the necessary permissions to write, is responsible for retrieving and posting the results, ensuring a secure and controlled execution process.

### **workflowB: Downloading Artifacts and Posting Results**

This workflow is triggered when `workflowA` completes successfully.

**Complete workflow file (`.github/workflows/report.yml`):**

```yaml
name: Publish Test Report

on:
  workflow_run:
    workflows: ['Run Tests']
    types: [completed]

permissions:
  pull-requests: write
  contents: read

jobs:
  report:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    
    steps:
      - name: Download Test Report Artifact
        uses: dawidd6/action-download-artifact@v8
        with:
          name: testReport
          run_id: ${{ github.event.workflow_run.id }}
          path: artifacts
      
      - name: Determine PR number securely
        id: get_pr
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          HEAD_SHA="${{ github.event.workflow_run.head_sha }}"

          PR_NUM=$(gh pr list \
            --state open \
            --json number,headRefOid \
            --jq ".[] | select(.headRefOid==\"${HEAD_SHA}\") | .number")

          if [ -z "$PR_NUM" ]; then
            echo "No open PR found for head SHA ${HEAD_SHA}"
            exit 1
          fi

          echo "PR_NUMBER=$PR_NUM" >> $GITHUB_ENV
      
      - name: Publish Test Report
        uses: ctrf-io/github-test-reporter@v1
        with:
          report-path: 'artifacts/ctrf-report.json'
          pull-request: ${{ env.PR_NUMBER }}
          update-comment: true
          comment-tag: test-report
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Key Security Details

> ⚠️ **Security Principle**: Never trust data from artifacts created by fork PRs for control flow decisions. Always retrieve critical metadata (like PR numbers) from trusted sources like GitHub's API.

**Important points:**

- **Download Test Report Artifact:** Since GitHub Actions does not allow direct artifact downloads across workflows using `actions/download-artifact`, we use [`dawidd6/action-download-artifact@v8`](https://github.com/dawidd6/action-download-artifact) instead. This enables downloading artifacts from a previous workflow run by specifying the `run_id`.

- **Only download the test report artifact.** Do not download PR number or other metadata from the forked workflow. Artifacts from fork PRs are untrusted and should only be treated as test data.

- **Permissions:** The workflow explicitly requests `pull-requests: write` permission to comment on PRs, while limiting other permissions to `contents: read` for security.

- **Workflow completion check:** The job only runs if the previous workflow completed successfully (`github.event.workflow_run.conclusion == 'success'`), as shown in the complete workflow file above.

- **Determine PR Number:** Get the PR number via GitHub's API using the `head_sha` from `workflow_run`. This ensures the PR number comes from a trusted source. **Why this is secure:** The PR number comes from GitHub's trusted API, not from a forked PR's artifact. This eliminates the risk of a malicious contributor making the workflow comment on the wrong PR.