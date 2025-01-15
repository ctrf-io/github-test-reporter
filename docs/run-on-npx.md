# Run on NPX

Add to your Github Actions workfile file:

```bash
npx github-actions-ctrf path-to-your-ctrf-report.json
```

Or use a glob pattern:

```bash
npx github-actions-ctrf "ctrf/*.json"
```

Before using the commands, ensure that your GitHub Actions runner has Node.js
installed.

Generate a CTRF report using your testing framework.
[CTRF reporters](https://github.com/orgs/ctrf-io/repositories) are available for
most testing frameworks and easy to install.

**No CTRF reporter? No problem!**

Use [junit-to-ctrf](https://github.com/ctrf-io/junit-to-ctrf) to convert a JUnit
report to CTRF

## Full example

```yaml
name: Example workflow file

on: [push]

jobs:
  testing:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Generate Report
        run: npx github-actions-ctrf path-to-your-ctrf-report.json
        if: always()
```

### Generating All Tables

For all general tables, add the following command to your workflow YAML:

```yaml
- name: Publish CTRF Test Summary Results
  run: npx github-actions-ctrf path-to-your-ctrf-report.json
  if: always()
```

### Generating Test Summary Table

For a test summary table, add the `summary` command to your workflow yaml:

```yaml
- name: Publish CTRF Test Summary Results
  run: npx github-actions-ctrf summary path-to-your-ctrf-report.json
  if: always()
```

### AI Summary

For a AI summary table, add the `ai` command to your workflow yaml:

```yaml
- name: Publish CTRF AI Test Summary Results
  run: npx github-actions-ctrf ai path-to-your-ctrf-report.json
  if: always()
```

To generate an AI summary checkout the
[AI Test Reporter](https://github.com/ctrf-io/ai-test-reporter)

### Generating Detailed Test Table

For a test details table, add the `tests` command to your workflow yaml:

```yaml
- name: Publish CTRF Detailed Test Summary Results
  run: npx github-actions-ctrf tests path-to-your-ctrf-report.json
  if: always()
```

### Generating Test list

For a simple list of tests, add the `test-list` command to your workflow yaml:

```yaml
- name: Publish CTRF test list
  run: npx github-actions-ctrf test-list path-to-your-ctrf-report.json
  if: always()
```

### Generating Failed Test Details Table

For a failed test details table, add the `failed` command to your workflow yaml:

```yaml
- name: Publish CTRF Failed Test Summary Results
  run: npx github-actions-ctrf failed path-to-your-ctrf-report.json
  if: always()
```

### Generating Failed Folded Test Details Table

For a failed test table with details folded, add the `failed-folded` command to
your workflow yaml:

```yaml
- name: Publish CTRF Failed Test Summary Results
  run: npx github-actions-ctrf failed-folded path-to-your-ctrf-report.json
  if: always()
```

### Generating Failed Rate Test Details Table

To see the failed test rate over time, add the `failed-rate` command to your
workflow yaml:

```yaml
- name: Publish CTRF Flaky Test Summary Results
  run: npx github-actions-ctrf failed-rate path-to-your-ctrf-report.json
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Requires artifact upload

### Generating Flaky Test Details Table

To see which tests were flaky in this run, add the `flaky` command to your
workflow yaml:

```yaml
- name: Publish CTRF Flaky Test Summary Results
  run: npx github-actions-ctrf flaky path-to-your-ctrf-report.json
  if: always()
```

### Generating Flaky Rate Test Details Table

To see the flakiness of your tests over time, add the `flaky-rate` command to
your workflow yaml:

```yaml
- name: Publish CTRF Flaky Rate Test Summary Results
  run: npx github-actions-ctrf flaky-rate path-to-your-ctrf-report.json
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Requires artifact upload

### Generating skipped Test Details Table

To see which tests were skipped or pending, add the `skipped` command to your
workflow yaml:

```yaml
- name: Publish CTRF Skipped Test Summary Results
  run: npx github-actions-ctrf skipped path-to-your-ctrf-report.json
  if: always()
```

### Generating Suite Folded Table

To see which tests grouped by suite with tests folded, add the `suite-folded`
command to your workflow yaml:

```yaml
- name: Publish CTRF Suite Folded Summary
  run: npx github-actions-ctrf suite-folded path-to-your-ctrf-report.json
  if: always()
```

Groups by filePath by default, add argument `--useSuite` to use suite property

### Generating Suite List

To see which tests grouped by suite with tests listed, add the `suite-list`
command to your workflow yaml:

```yaml
- name: Publish CTRF Suite Folded Summary
  run: npx github-actions-ctrf suite-list path-to-your-ctrf-report.json
  if: always()
```

Groups by filePath by default, add argument `--useSuite` to use suite property

### Generating Previous Tests Table

To see results from previous tests, add the `historical` command to your
workflow yaml:

```yaml
- name: Publish CTRF Historical results table
  run: npx github-actions-ctrf historical path-to-your-ctrf-report.json
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Requires artifact upload

### Generating a Custom Report

To use a custom summary using a handlebars template, add the `custom` command to
your workflow:

```yaml
- name: Publish CTRF Custom summary
  run:
    npx github-actions-ctrf custom path-to-your-ctrf-report.json
    path-to-your-handlebars-template.hbs
  if: always()
```

### Generating a Community Built Report

To use a community built report, add the `community` command to your workflow
and the name of the report template:

```yaml
- name: Publish CTRF Community Report
  run:
    npx github-actions-ctrf community path-to-your-ctrf-report.json
    report-template-name
  if: always()
```

### Post a Pull Request Comment

To post a comment on the pull request with test results, add the `pull-request`
command to your workflow:

```yaml
- name: Publish CTRF pull request comment
  run: npx github-actions-ctrf pull-request path-to-your-ctrf-report.json
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Generating Fail annotations

For test annotations, add the `annotate` argument to your workflow yaml:

```yaml
- name: Annotate failed tests
  run: npx github-actions-ctrf annotate path-to-your-ctrf-report.json
  if: always()
```

## Options

- `--title`: Title of the summary.
- `--annotate`: annotate failed tests.
- `--domain`: Base URL for GitHub Enterprise Server
- `--pull-request`: Post a Pull Request comment with the summary
- `--on-fail-only`: Post a Pull Request comment only if there are failed tests
- `--exit-on-fail`: Sets the action status to failed when a failed tests is
  found
- `--use-suite-name`: Prefix test name with suite name
- `--fetch-previous-results`: Always fetch previous workflow runs when using
  custom templates

## Storing Artifacts

Some views require you to store CTRF reports as artifacts:

This ensures that the test results are available for future runs.

```yaml
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: ctrf-report
    path: path-to-your-ctrf-report.json
```

## Merge reports

You can merge reports if your chosen reporter generates multiple reports through
design, parallelisation or otherwise.

If you use a glob pattern, reports will be merged automatically, otherwise the
[ctrf-cli](https://github.com/ctrf-io/ctrf-cli) package provides a method to
merge multiple ctrf json files into a single file.

After executing your tests, use the following command:

```sh
npx ctrf merge <directory>
```

Replace directory with the path to the directory containing the CTRF reports you
want to merge.

### Glob Pattern

A glob pattern is a string that specifies sets of filenames with wildcards and
special characters. This allows you to match multiple files or directories
without specifying each file explicitly.

Here are some examples of glob patterns you can use:

`ctrf/ctrf-report.json` - Matches the exact file ctrf/ctrf-report.json.

`ctrf/*.json` - Matches all .json files in the ctrf directory.

`ctrf/**/*.json`- Matches all .json files in the ctrf directory and its
subdirectories.

`ctrf/ctrf-report*` - Matches any file starting with ctrf-report (e.g.,
ctrf-report.json, ctrf-report-old.json).

## Pull Requests

There are two ways you can post comments on pull requests.

The first is by using the `pull-request` method, which uses a standard pull
request view:

```yaml
- name: Publish CTRF pull request comment
  run: npx github-actions-ctrf pull-request path-to-your-ctrf-report.json
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Additionally, you can post a pull request comment with your chosen view, like
`flaky-rate`, by adding the `pull-request` argument to your command:

```yaml
- name: Post PR Comment
  run: npx github-actions-ctrf flaky-rate ctrf-report.json --pull-request
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `pull-request` argument works with all views.

To post a pull request comment only when tests fail, add the `--on-fail-only`
argument to your command.

The GITHUB_TOKEN is typically available by default in GitHub Actions, but it
needs to have write permissions for pull requests. For guidance on configuring
these permissions, please see GitHub's
[documentation](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
or
[GitHub Enterprise Server documentation](https://docs.github.com/en/enterprise-server@3.14/actions/security-for-github-actions/security-guides/automatic-token-authentication#about-the-github_token-secret)

### Comment Management Inputs

`--update-comment` (optional, boolean) If true and an existing tagged comment is
found, the new report is appended to it. Otherwise, a new comment is created.

`--overwrite-comment` (optional, boolean) If true and an existing tagged comment
is found, that comment’s entire content is replaced with the new report.
Otherwise, a new comment is created.

`--comment-tag` (optional, string) A unique identifier for comments posted. Used
to find and update/overwrite existing comments.

These options provide flexibility in how you manage comments. For example, you
can continually update or overwrite a single comment or create separate comments
per workflow or job.

For example, the following command creates or updates a comment tagged with the
current workflow and job names:

`npx github-actions-ctrf pull-request path-to-your-ctrf-report.json --update-comment --comment-tag "${{ github.workflow }}-${{ github.job }}"`

## Previous Test Results

The Historical table method comes with several options to customize the output:

- `--rows`: Specifies the number of historical test result rows to show in the
  table. The default value is 10.

- `--artifact-name`: Sets the name of the artifact where the CTRF report is
  stored. The default name is ctrf-report.

## Generating an AI summary

You can generate human-readable AI summary for your failed tests using models
from the leading AI providers by using the
[AI Test Reporter](https://github.com/ctrf-io/ai-test-reporter)

## Custom summary

The custom summary method lets you define how the Github Actions summary or PR
comment is presented by using a Handlebars template. The template can include
any markdown content and leverage data from your CTRF report and GitHub
properties, allowing for dynamic and customizable output.

### How to Use the Custom Summary Command

To use the `custom` summary method, you need to pass two arguments:

- **CTRF Report File:** The path to your CTRF report file, which contains the
  results of your tests.
- **Handlebars Template File:** The path to a Handlebars file that contains the
  markdown template.

add the following to your workflow yaml:

```yaml
- name: Publish CTRF Custom summary
  run:
    npx github-actions-ctrf custom path-to-your-ctrf-report.json
    path-to-your-handlebars-template.hbs
  if: always()
```

## Alternative Installation Options

### Locking to a Specific Version with `npx`

The easiest way to run `github-actions-ctrf` is by using `npx`, which doesn't
require installation. By default, it runs the latest version. However, if you'd
like to lock to a specific version, you can do so by specifying the version:

```bash
npx github-actions-ctrf@1.2.3 path-to-your-ctrf-report.json
```

This command will download and run the specified version of
`github-actions-ctrf`.

### Local Installation in Your Node.js Project

For users who prefer installing the package locally to their project, you can
install `github-actions-ctrf` as a project dependency:

```bash
npm install github-actions-ctrf
```

This will install `github-actions-ctrf` into your `node_modules` folder, and you
can run it with the following command:

```bash
./node_modules/.bin/github-actions-ctrf path-to-your-ctrf-report.json
```

Alternatively, you can add a script to your `package.json` to simplify the
command:

```json
{
  "scripts": {
    "report": "github-actions-ctrf path-to-your-ctrf-report.json"
  }
}
```

Now, you can run:

```bash
npm run report
```
