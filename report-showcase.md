# Report Showcase

A showcase of built-in reports

## Table of Contents

## Summary Report

### Overview

Provides a quick summary of the test results, displayed in a concise table format. Use it to get an overview of test statuses, including passed, failed, skipped, pending, flaky and other categories.

### Usage

Set the `summary-report` input to true in your workflow configuration:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    summary-report: true
  if: always()
```

---

| **Tests 📝** | **Passed ✅** | **Failed ❌** | **Skipped ⏭️** | **Pending ⏳** | **Other ❓** | **Flaky 🍂** | **Duration ⏱️** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |


## Test Report

### Overview

Provides a detailed test report of all executed test cases, including their status, whether they are marked as flaky, and their execution duration. Use this table to identify test cases that passed, failed, are skipped, pending, or marked with other statuses. It also highlights tests that require attention due to potential flakiness.

### Usage

Set the `test-report` input to true in your workflow configuration:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    test-report: true
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


## Test List Report

### Overview

Provides a detailed, line-by-line breakdown of all executed test cases, their statuses, and associated error messages or additional context for failures. This report is particularly useful for quickly identifying failed tests, understanding why they failed, and tracking the overall progress of test execution. Each test case includes its status (e.g., passed, failed, skipped, etc.) along with any relevant failure details

### Usage

Set the `test-list-report` input to true in your workflow configuration:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    test-list-report: true
  if: always()
```

---

**✅ should be able to login**

**❌ should display title**

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Timed out 5000ms waiting for expect\(locator\)\.toHaveTitle\(expected\)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Locator: locator\(&#x27;:root&#x27;\)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Expected pattern: /Playwrc cight/

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Received string:  &quot;Fast and reliable end\-to\-end testing for modern web apps | Playwright&quot;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Call log:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  \- expect\.toHaveTitle with timeout 5000ms

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  \- waiting for locator\(&#x27;:root&#x27;\)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  \-   locator resolved to &lt;html lang&#x3D;&quot;en&quot; dir&#x3D;&quot;ltr&quot; data\-theme&#x3D;&quot;light&quot; data\-has\-…&gt;…&lt;/html&gt;
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  \-   unexpected value &quot;Fast and reliable end\-to\-end testing for modern web apps | Playwright&quot;
**✅ should be able to update profile**
**⏭️ should be able to logout**
**✅ should validate user settings**
**❌ should fail to update profile on network failure**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Network Timeout
**❌ should fail to update profile on network failure**
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;No failure message
**⏳ should load user data**
**✅ should handle session timeouts**
**❓ should clean up user session on logout**
**✅ should allow user to change password**

## Failed Report

### Overview

Focuses exclusively on failed test cases, providing a clear and concise summary of each failure. For every failed test, the report includes the test name, the failure message. This report is designed to help developers quickly diagnose and address issues.

### Usage

Set the `failed-report` input to true in your workflow configuration:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    failed-report: true
  if: always()
```

---

<table>
    <thead>
      <tr>
        <th>Failed Tests ❌</th>
        <th>Fail Message</th>
      </tr>
    </thead>
    <tbody>
        <tr>
          <td>❌ should display title</td>
          <td>Timed out 5000ms waiting for expect(locator).toHaveTitle(expected)<br><br>Locator: locator(':root')<br>Expected pattern: /Playwrc cight/<br>Received string:  "Fast and reliable end-to-end testing for modern web apps | Playwright"<br>Call log:<br>  - expect.toHaveTitle with timeout 5000ms<br>  - waiting for locator(':root')<br>  -   locator resolved to <html lang="en" dir="ltr" data-theme="light" data-has-…>…</html><br>  -   unexpected value "Fast and reliable end-to-end testing for modern web apps | Playwright"<br></td>
        </tr>
        <tr>
          <td>❌ should fail to update profile on network failure</td>
          <td>Network Timeout</td>
        </tr>
        <tr>
          <td>❌ should fail to update profile on network failure</td>
          <td>No failure message</td>
        </tr>
    </tbody>
  </table>


 ## Fail Rate Report



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