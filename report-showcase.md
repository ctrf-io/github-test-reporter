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

### Overview

Provides a detailed analysis of the fail rates for tests that are currently live and were executed in the latest run. By incorporating both the current run and historical data, it provides a comprehensive view of test stability over time. This report highlights the fail rate for each individual test as well as the overall fail rate for the entire test execution, helping teams evaluate the reliability of their test suite and focus on areas that require attention.

The fail rate reflects how often tests fail based on their final outcomes, excluding any retries. This metric identifies tests with consistent failures, enabling teams to prioritize fixes and improve overall test reliability.

Test case fail rate is calculated by dividing the fail count by the total runs
and multiplying by 100:

Fail Rate (%) = (Fail Count ÷ Total Runs) × 100

Overall fail rate across all tests is calculated by summing the fail counts and
total runs of all tests:

Overall Fail Rate (%) = (Total Fail Counts of All Tests ÷ Total Runs of All
Tests) × 100

### Usage

Set the `fail-rate-report` input to true in your workflow configuration:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    fail-rate-report: true
  if: always()
```

---

#### Overall Fail Rate: 13.56%

| Test 📝                                          |   Runs 🎯 |   Pass ✅ |   Fail ❌ |   Fail Rate % |
|--------------------------------------------------|-----------|-----------|-----------|---------------|
| should fail to update profile on network failure |        12 |         8 |         4 |       33.33   |
| should load user data                            |         9 |         6 |         3 |       33.33   |
| should clean up user session on logout           |         6 |         4 |         2 |       33.33   |
| should display title                             |        10 |         7 |         3 |       30      |
| should be able to logout                         |         8 |         6 |         2 |       25      |

<sub><i>Measured over 6 runs.</i></sub>

## flaky report

### Overview



### Usage

Set the `fail-rate-report` input to true in your workflow configuration:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    fail-rate-report: true
  if: always()
```

---


| **Flaky Tests 🍂** | **Retries** |
| --- | --- |
| 🍂 should be able to update profile | 2 |
| 🍂 should handle session timeouts | 1 |
| 🍂 should allow user to change password | 3 |

 ## flaky rate report

 #### Overall Flaky Rate: 35.29%

| Test 📝 | Attempts 🎯 | Pass ✅ | Fail ❌ | Flaky Rate % 🍂 |
| --- | --- | --- | --- | --- |
| should allow user to change password | 28 | 7 | 21 | 75.00 |
| should be able to update profile | 21 | 7 | 14 | 66.67 |
| should handle session timeouts | 14 | 7 | 7 | 50.00 |

<sub><i>Measured over 7 runs.</i></sub>

 ## failed folded report

 <table>
  <thead>
    <tr>
      <th>Failed Tests</th>
    </tr>
  </thead>
  <tbody>
      <tr>
        <td>
          <details>
            <summary>❌ should display title</summary>
            <pre><code>Timed out 5000ms waiting for expect(locator).toHaveTitle(expected)
Locator: locator(&#x27;:root&#x27;)
Expected pattern: /Playwrc cight/
Received string:  &quot;Fast and reliable end-to-end testing for modern web apps | Playwright&quot;
Call log:
  - expect.toHaveTitle with timeout 5000ms
  - waiting for locator(&#x27;:root&#x27;)
  -   locator resolved to &lt;html lang&#x3D;&quot;en&quot; dir&#x3D;&quot;ltr&quot; data-theme&#x3D;&quot;light&quot; data-has-…&gt;…&lt;/html&gt;
  -   unexpected value &quot;Fast and reliable end-to-end testing for modern web apps | Playwright&quot;
</code></pre>
            <p><strong>Trace:</strong></p>
            <pre><code>ProfileTest.js:45</code></pre>
          </details>
        </td>
      </tr>
      <tr>
        <td>
          <details>
            <summary>❌ should fail to update profile on network failure</summary>
            <pre><code>Network Timeout</code></pre>
            <p><strong>Trace:</strong></p>
            <pre><code>ProfileUpdateTest.js:60</code></pre>
          </details>
        </td>
      </tr>
      <tr>
        <td>
          <details>
            <summary>❌ should fail to update profile on network failure</summary>
            <pre><code>No message available</code></pre>
            <p><strong>Trace:</strong></p>
            <pre><code>No trace available</code></pre>
          </details>
        </td>
      </tr>
  </tbody>
</table>

 ## previous-results-report

 | **Build 🏗️** | **Result 🧪** | **Tests 📝** | **Passed ✅** | **Failed ❌** | **Skipped ⏭️** | **Pending ⏳** | **Other ❓** | **Flaky 🍂** | **Duration ⏱️** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [#7](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12818357737#summary) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |
| [#6](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12818178851) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |
| [#5](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12818142979) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |
| [#4](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12818015408) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |
| [#3](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12817883348) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |
| [#2](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12817830233) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |
| [#1](https://github.com/Ma11hewThomas/github-test-reporter-test/actions/runs/12817798111) | ❌ | 10 | 5 | 3 | 1 | 1 | 1 | 3 | 11.0s |

 ## ai-report

<table>
    <thead>
        <tr>
            <th>Failed Tests</th>
            <th>AI Summary ✨</th>
        </tr>
    </thead>
    <tbody>
<tr>
            <td>❌ should display title</td>
            <td>The test failed because the page title didn't match the expected value within the given timeout period.<br><br>To resolve this issue, you should first check if the title of the page is correct in your application. It seems there might be a typo or a misunderstanding about what the actual title should be. If 'Common Test Report Format' is indeed the correct title, you'll need to update your test expectations. On the other hand, if 'Uncommon Test Report Format' is the intended title, you'll need to fix the title in your application code.<br><br>Another possibility is that the page might be taking longer to load than expected, causing the title to not appear within the 5-second timeout. In this case, you could try increasing the timeout duration in your test to give the page more time to load completely.</td>
        </tr><tr>
            <td>❌ should fail to update profile on network failure</td>
            <td>No AI summary available</td>
        </tr><tr>
            <td>❌ should fail to update profile on network failure</td>
            <td>No AI summary available</td>
        </tr>    </tbody>
</table>

 ## skipped-report


| **Tests** | **Status** |
| --- | --- |
|       should be able to logout | skipped ⏭️ |
|       should load user data | pending ⏳ |
|       should clean up user session on logout | other ❓ |
    

 ## suite-folded-report
  ## suite-list-report
 ## pull-request-report
 ## custom-report