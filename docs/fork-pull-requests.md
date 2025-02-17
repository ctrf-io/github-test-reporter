# 🚀 GitHub Actions: Securely Commenting Test Results on All PRs

## 📌 Overview

This tutorial explains how to set up a GitHub Actions workflow that runs tests and comments on the results of pull requests (PRs), including those from forks. Using two workflows ensures security while allowing test reports to be posted on all types of PRs.

The setup consists of two workflows:

1. **`workflowA`** - Runs tests and uploads the test results as artifacts.
2. **`workflowB`** - Retrieves test results and comments on the corresponding pull request.

This method is applicable to any project using GitHub Actions for CI/CD, ensuring a secure and efficient way to handle test reporting.

---

## ⚠️ Important Note

These workflows should be implemented on the default branch of the repository (either `master` or `main` in newer repositories) to ensure proper execution and integration. Running workflows on other branches may lead to unexpected behavior, security issues, or failure to post comments on pull requests.

---

## 🔐 Why Use Two Workflows?

GitHub restricts workflows triggered by `pull_request` events from writing to the base repository when PRs originate from forks. This limitation prevents workflows from commenting on pull requests directly.

Using `pull_request_target` instead of `pull_request` allows commenting on forked PRs, but it introduces a significant security risk: the workflow runs with write permissions on the base repository, making it vulnerable to malicious code execution. Attackers could potentially modify workflows to exfiltrate secrets, overwrite critical repository files, or introduce malicious changes that could be merged unnoticed.

To mitigate this, we split the workflow into two:

- **The first workflow (********`workflowA`********)** runs tests and uploads the results as artifacts. This workflow is triggered using `pull_request`, ensuring it runs whenever a new pull request is opened, updated, or reopened.
- **The second workflow (********`workflowB`********)** is triggered by `workflow_run` when the first workflow completes. Since `workflow_run` does not inherit permissions from the pull request, it eliminates security issues while allowing it to post a comment securely.

This method ensures that test results are always accessible while maintaining security.

---

## 🔄 Step-by-Step Workflow Execution

### **1️⃣ workflowA: Running Tests and Uploading Artifacts**

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

### **2️⃣ workflowB: Downloading Artifacts and Posting Results**

This workflow is triggered when `workflowA` completes successfully. Since GitHub Actions does not allow direct artifact downloads across workflows using `actions/download-artifact`.

- **Download Test Report Artifact:** Since GitHub Actions does not allow direct artifact downloads across workflows using `actions/download-artifact`, we use [`dawidd6/action-download-artifact@v8`](https://github.com/dawidd6/action-download-artifact) instead. This repository enables downloading artifacts from a previous workflow run by specifying the `run_id`, which is essential when handling artifacts between separate workflows. It follows these steps:
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

```yaml
- name: Publish Test Report
  uses: test-reporter/github-test-reporter@v1.0.6
  with:
    report-path: 'artifacts/test-report.json'          
    issue: ${{ env.PR_NUMBER }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This final step posts the test report as a comment on the pull request, making it easy for contributors and maintainers to review test results.

---

## ✅ Conclusion

By structuring the workflows this way, we achieve the following:

- **Secure execution** without exposing repository write access to forked pull requests.
- **Successful test execution** and result upload.
- **Seamless commenting** on pull requests with test results while mitigating security risks.

This method ensures that test results are reliably posted while maintaining a secure GitHub Actions setup. Additionally, this approach scales effectively for large repositories with many PRs, as the artifact-based workflow minimizes redundant computations and ensures efficient resource utilization. 🚀

