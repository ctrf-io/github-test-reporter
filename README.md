# Github Actions Publish Test Results

> View Test Results Report on Github Actions

![Static Badge](https://img.shields.io/badge/official-red?label=ctrf&labelColor=green)
[![build](https://github.com/ctrf-io/github-actions-ctrf/actions/workflows/main.yaml/badge.svg)](https://github.com/ctrf-io/github-actions-ctrf/actions/workflows/main.yaml)
![NPM Downloads](https://img.shields.io/npm/d18m/github-actions-ctrf?logo=npm)
![GitHub Repo stars](https://img.shields.io/github/stars/ctrf-io/github-actions-ctrf)

Display test results directly within your GitHub workflow summary without installing a custom action.

# **⭐⭐ If you find this project useful, consider giving it a GitHub star ⭐⭐**

![Example view](images/all.png)

## Help grow CTRF

You can help grow CTRF by doing the following:

- Follow the [CTRF organisation](https://github.com/ctrf-io)
- Give this repository a star ⭐

It means a lot to us! 

## Features

- View test results on Github Actions summary
- Several views available, `Test Summary`, `Test Details`, `Failed Tests`, `Flaky Tests`
- Post results summary on Pull Request
- Run with a single command `npx github-actions-ctrf your-report.json`
- Detect flaky tests

## Usage

Add to your Github Actions workfile file:

``` bash
npx github-actions-ctrf path-to-your-ctrf-report.json
```

Before using the commands, ensure that your GitHub Actions runner has Node.js installed.

Generate a CTRF report using your testing framework. [CTRF reporters](https://github.com/orgs/ctrf-io/repositories) are available for most testing frameworks and easy to install.

**No CTRF reporter? No problem!**

Use [junit-to-ctrf](https://github.com/ctrf-io/junit-to-ctrf) to convert a JUnit report to CTRF

### Full example

``` yaml
name: Example workflow file

on: [push]

jobs:
  testing:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    - name: Run CTRF annotations
      run: npx github-actions-ctrf path-to-your-ctrf-report.json
      if: always()
```

### Generating All Tables

For a all tables, add the following to your workflow YAML:

``` yaml
- name: Publish CTRF Test Summary Results
  run: npx github-actions-ctrf path-to-your-ctrf-report.json
  if: always()
```

### Generating Test Summary Table

For a test summary table, add the `summary` argument to your workflow yaml:

``` yaml
- name: Publish CTRF Test Summary Results
  run: npx github-actions-ctrf summary path-to-your-ctrf-report.json
  if: always()
```

### Generating Detailed Test Table

For a test details table, add the `tests` argument to your workflow yaml:

``` yaml
- name: Publish CTRF Detailed Test Summary Results
  run: npx github-actions-ctrf tests path-to-your-ctrf-report.json
  if: always()
```

### Generating Failed Test Details Table

For a failed test details table, add the `failed` argument to your workflow yaml:

``` yaml
- name: Publish CTRF Failed Test Summary Results
  run: npx github-actions-ctrf failed path-to-your-ctrf-report.json
  if: always()
```

### Generating Flaky Test Details Table

For a flaky test details table, add the `flaky` argument to your workflow yaml:

``` yaml
- name: Publish CTRF Flaky Test Summary Results
  run: npx github-actions-ctrf flaky path-to-your-ctrf-report.json
  if: always()
```

### Generating Fail annotations

For test annotations, add the `annotate` argument to your workflow yaml:


``` yaml
- name: Annotate failed tests
  run: npx github-actions-ctrf annotate path-to-your-ctrf-report.json
  if: always()
```

## Posting a Pull Request Comment

You can automatically post a summary of your test results as a comment on your pull request by using the `--pr-comment` argument.

To use this feature, add the `--pr-comment` argument to your command and ensure that the GITHUB_TOKEN is set as an environment variable in your workflow configuration:

```yaml
- name: Post PR Comment
  run: npx github-actions-ctrf ctrf-report.json --pr-comment
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The GITHUB_TOKEN is typically available by default in GitHub Actions, but it needs to have write permissions for pull requests. For guidance on configuring these permissions, please see GitHub's [documentation](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token).

### For GitHub Enterprise Server Users

If you are using GitHub Enterprise Server, you need to specify the base URL of your GitHub Enterprise instance. Use the `--domain ` argument to provide this URL:

```yaml
- name: Post PR Comment on GitHub Enterprise Server
  run: npx github-actions-ctrf ctrf-report.json --pr-comment --domain https://your-enterprise-domain.com
  if: always()
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Replace https://your-enterprise-domain.com with the base URL of your GitHub Enterprise Server instance. The GITHUB_TOKEN used must have appropriate permissions on the GitHub Enterprise Server instance. For more details, refer to the [GitHub Enterprise Server documentation](https://docs.github.com/en/enterprise-server@3.14/actions/security-for-github-actions/security-guides/automatic-token-authentication#about-the-github_token-secret) on configuring tokens and permissions.


![PR](images/pr.png)

## Merge reports

You can merge reports if your chosen reporter generates multiple reports through design, parallelisation or otherwise.

The [ctrf-cli](https://github.com/ctrf-io/ctrf-cli) package provides a method to merge multiple ctrf json files into a single file.

After executing your tests, use the following command:

```sh
npx ctrf merge <directory>
```

Replace directory with the path to the directory containing the CTRF reports you want to merge.

## Components

[Click here](https://github.com/ctrf-io/github-actions-ctrf/actions) to see the Actions of this repository for a full example

### Summary

![Summary](images/summary.png)

### Test details

![Tests](images/tests.png)

### Failed details

![Failed](images/failed.png)

### Flaky details

![Flaky](images/flaky.png)

## What is CTRF?

CTRF is a universal JSON test report schema that addresses the lack of a standardized format for JSON test reports.

**Consistency Across Tools:** Different testing tools and frameworks often produce reports in varied formats. CTRF ensures a uniform structure, making it easier to understand and compare reports, regardless of the testing tool used.

**Language and Framework Agnostic:** It provides a universal reporting schema that works seamlessly with any programming language and testing framework.

**Facilitates Better Analysis:** With a standardized format, programatically analyzing test outcomes across multiple platforms becomes more straightforward.

## Support Us

If you find this project useful, consider giving it a GitHub star ⭐ It means a lot to us.
