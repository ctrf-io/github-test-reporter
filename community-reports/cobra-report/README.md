# Template Name: cobra-report

## Description

The **cobra-report** template is designed to provide a concise overview of your test suite results. It displays key metrics including the total number of tests, passed tests, failed tests, and skipped tests. Additionally, when failures occur, it renders a detailed table listing each failed test along with its failure message. If there are no failing tests, the template will render **No failed tests 🎉** instead of the failed tests table

---

## How to Use

Reference this template by its name in your workflow configuration:

```
cobra-report
```

Then, add it to your workflow file as follows:

```yaml
- name: Publish Test Report
  uses: ctrf-io/github-test-reporter@v1
  with:
    report-path: './ctrf/*.json'
    community-report: true
    communty-reportn-name: cobra-report
  if: always()
```

Ensure your report JSON files are generated correctly and placed in the expected path.

## Important Considerations

- **JSON Structure:** Verify that your test results JSON conforms to the expected format, so that the template can correctly parse the summary values and test statuses.
- **Custom Helpers:** This template utilizes custom helpers such as `getCtrfEmoji`, `formatMessage`, and `anyFailedTests`. Make sure these are available in your environment.
- **Conditional Rendering:** The detailed table of failed tests will only appear if there is at least one test with a `failed` status.

## What it Looks Like

### Summary Section

| **Tests 📝** | **Passed ✅** | **Failed ❌** | **Skipped ⏭️** |
| --- | --- | --- | --- |
| 5 | 3 | 1 | 1 |

### ❌ Some tests failed!


<table>
  <thead>
    <tr>
      <th>Failed Tests </th>
      <th>Fail Message</th>
    </tr>
  </thead>
  <tbody>
      <tr>
        <td>test 1</td>
        <td>
            error message!
        </td>
      </tr>
  </tbody>
</table>

### OR

### No failed tests 🎉
