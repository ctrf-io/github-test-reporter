# Github Actions Publish Test Results

> View Test Results Report on Github Actions

![Static Badge](https://img.shields.io/badge/official-red?label=ctrf&labelColor=green)
[![build](https://github.com/ctrf-io/github-actions-ctrf/actions/workflows/main.yaml/badge.svg)](https://github.com/ctrf-io/github-actions-ctrf/actions/workflows/main.yaml)
![NPM Downloads](https://img.shields.io/npm/d18m/github-actions-ctrf?logo=npm)
![GitHub Repo stars](https://img.shields.io/github/stars/ctrf-io/github-actions-ctrf)

Display test results directly within your GitHub workflow summary without installing a custom action.

![Example view](images/summary.png)

⭐ **If you find this project useful, consider giving it a GitHub star** ⭐

It means a lot to us and helps us grow this open source library.

## We need your help

We believe CTRF can save **a lot** of time for engineers, a single data serialisation report, well structured, community driven and works with any framework. For over 30s years software engineers have used a de facto data serialisation report, you know the one! But we feel it’s time to modernise.

The only way we can grow CTRF is with your help and the support of the software engineering community.

## How can you help?

- Build with us! We are looking for [contributors](https://github.com/ctrf-io), get involved in this early stage project. All contributions are welcome.
- Give this repository a star ⭐⭐⭐⭐⭐⭐
- Follow the CTRF [GitHub organisation](https://github.com/ctrf-io)
- Clap for our medium articles (30 times each) 👏
- Share, share share! Discord, Reddit, Twitter, LinkedIn, Slack, Teams, whereever! - please share our [libraries](https://github.com/orgs/ctrf-io/repositories), our [homepage](https://www.ctrf.io/), our [Medium articles](https://medium.com/@ma11hewthomas)
- Maybe even write a blog about us!
- Try our [tools](https://github.com/orgs/ctrf-io/repositories)

**Thank you so much!!**

## Features

- View test results on Github Actions summary
- Several views available, `Test Summary`, `Test Details`, `Failed Tests`, `Flaky Tests`
- Run with a single command `npx github-actions-ctrf your-report.json`
- Detect flaky tests

## Usage

Add to your Github Actions workfile file:

``` bash
npx github-actions-ctrf path-to-your-ctrf-report.json
```

Before using the commands, ensure that your GitHub Actions runner has Node.js installed.

Generate a CTRF report using your testing framework. [CTRF reporters](https://www.ctrf.io/docs/category/reporters) are available for most testing frameworks and easy to install.

**No CTRF reporter? No problem!**

Use [junit-to-ctrf](https://github.com/ctrf-io/junit-to-ctrf) to convert a JUnit report to CTRF:

```sh
npx junit-to-ctrf path/to/junit.xml
```

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

## Components

[Click here](https://github.com/github-actions-ctrf/actions) to see the Actions of this repository for a full example

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
