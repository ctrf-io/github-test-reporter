# Report Showcase

A showcase of built-in reports

## Table of Contents

## Summary Report

### Overview

Provides a quick summary of the test results, displayed in a concise table format. Use it to get an overview of test statuses, including passed, failed, skipped, pending, flaky and other categories.

### Usage

Set `summary-report` input to true

```yaml
- name: Publish Test Report
        uses: ./
        with:
          report-path: './ctrf/*.json'
          sumary-report: true
        if: always()
```

---

| **Tests 📝** | **Passed ✅** | **Failed ❌** | **Skipped ⏭️** | **Pending ⏳** | **Other ❓** | **Flaky 🍂** | **Duration ⏱️** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |


## Test Report

### Overview

Provides a detailed test report of all individual test results, including their status, whether they are marked as flaky, and their execution duration. Use this table to identify test cases that passed, failed, are skipped, pending, or marked with other statuses. It also highlights tests that require attention due to potential flakiness.

### Usage

Set `summary-report` input to true

```yaml
- name: Publish Test Report
        uses: ./
        with:
          report-path: './ctrf/*.json'
          sumary-report: true
        if: always()
```

| **Test Name** | **Status** | **Flaky** | **Duration** |
| --- | --- | --- | --- |
| should be able to login | ✅ |  | 1.2s |
| should display title | ❌ |  | 800ms |
| should be able to update profile | ✅ | 🍂 | 1.2s |
| should be able to logout | ⏭️ |  | 1ms |
| should validate user settings | ✅ |  | 1.1s |
| should fail to update profile on network failure | ❌ |  | 900ms |
| should fail to update profile on network failure | ❌ |  | 900ms |
| should load user data | ⏳ |  | 1ms |
| should handle session timeouts | ✅ | 🍂 | 950ms |
| should clean up user session on logout | ❓ |  | 1.1s |
| should allow user to change password | ✅ | 🍂 | 1.3s |


## test list report

 ## failed report
 ## fail rate report
  ## flaky report
 ## flaky rate report
 ## failed folded report
 ## previous-results-report
 ## ai-report
 ## skipped-report
 ## suite-folded-report
  ## suite-list-report
 ## pull-request-report
 ## custom-report