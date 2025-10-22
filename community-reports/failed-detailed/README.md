# Template Name: failed-detailed

## Description

The **failed-detailed** report focuses exclusively on failed test cases, providing a clear and detailed summary of each failure. For every failed test, the report includes the test name, the failure message, stack trace, code snippet, standard output, and standard error if available. This report is designed to help developers quickly diagnose and address issues providing the exact place where the failure occured. If there are no failing tests, the template will render **No failed tests 🎉** instead of the failed tests table.

---

## How to Use

Reference this template by its name in your workflow configuration:

```
failed-detailed
```

Then, add it to your workflow file as follows:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    community-report: true
    community-report-name: failed-detailed
  if: always()
```

Ensure your report JSON files are generated correctly and placed in the expected path.

> [!NOTE] 
> You can combine this report with the built-in reports by adding the `community-report` and `community-report-name` nodes to your existing workflow file.

## Important Considerations

- **JSON Structure:** Verify that your test results JSON conforms to the expected format, so that the template can correctly parse the summary values and test statuses.
- **Custom Helpers:** This template utilizes custom helpers such as `getCtrfEmoji` and `formatTestMessagePreCode`. Make sure these are available in your environment.
- **Conditional Rendering:** The detailed table of failed tests will only appear if there is at least one test with a `failed` status.

## What it Looks Like


<table>
  <thead>
      <tr>
          <th>Failed Tests ❌</th>
          <th>Fail Message</th>
      </tr>
  </thead>
  <tbody>
    <tr>
      <td>should display title</td>
      <td>
        <details>
          <summary>Error: expect(page).toHaveTitle(expected) failed</summary>
          <p><strong>Trace:</strong></p>
          <pre><code>Error: expect(page).toHaveTitle(expected) failed<br>Expect "toHaveTitle" with timeout 5000ms
    9 × unexpected value "Fast and reliable end-to-end testing for modern web apps | Playwright"<br>&nbsp;&nbsp;&nbsp;&nbsp;at .\Projects\Playwright\tests\example.spec.ts:7:22</code></pre>
          <p><strong>Snippet:</strong></p>
          <pre><code>   5 |
   6 |   // Expect a title "to contain" a substring.
>  7 |   await expect(page).toHaveTitle(/Playwright/);
     |                      ^
   8 | });
   9 |
  10 | test('should display title', async ({ page }) => {</code></pre>
          <p><strong>Standard Output:</strong></p>
          <pre><code>Navigated URL: https://playwright.dev/</code></pre>
          <p><strong>Standard Error:</strong></p>
          <pre><code>No standard error available</code></pre>
        </details>
      </td>      
    </tr>
  </tbody>
</table>

### OR

### No failed tests 🎉
