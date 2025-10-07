# Build Your Own Report

CTRF allows you to create personalized test result reports in GitHub Actions.
This guide will show you how to create your own custom report template using
CTRF, Handlebars and GitHub flavored markdown.

## Why Create a Custom Report?

- Full control over the layout and content of your test results
- Ability to highlight information that matters most to your team
- Flexibility to match your organization's reporting standards
- Integration with GitHub-specific data and workflow information
- Share your report with others by submitting it to the
  [community reports](https://github.com/ctrf-io/github-test-reporter#community-reports)
  section

Creating a Handlebars markdown template allows you to have full control over how
your test results are displayed. With CTRF, GitHub and Handlebars you can inject
dynamic content into your reports, making your them flexible to suit your needs.

You can apply custom templates when using the `custom-report` method.

## Showcase

All of our reports are built using handlebars, for inspiration check out the
[built-in reports](https://github.com/ctrf-io/github-test-reporter/tree/main/src/reports)
and
[community reports](https://github.com/ctrf-io/github-test-reporter/tree/main/community-reports).

And for a practical example, see the
[custom report example](https://github.com/ctrf-io/github-test-reporter/blob/main/templates/custom-report.hbs).

## Community Reports

The high level of control and flexibility allows for endless customization and a
wide range of reports that can be built by the community. That's why we've
created a
[community reports](https://github.com/ctrf-io/github-test-reporter#community-reports)
section where users can share their reports to be used by others.

## Helpful links

- [CTRF schema](https://www.ctrf.io/docs/schema/overview) - for the schema of
  the data available to use in your template
- [Handlebars documentation](https://handlebarsjs.com/) - for the templating
  language
- [GitHub Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) -
  for the markdown syntax
- [GitHub Context](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs) -
  for the context available to use in your template

## Basic Example

Here's a practical example of a Handlebars template that creates a test summary
with explanations:

```hbs
# Test Results Summary

## Overview
{{!-- Display basic test statistics --}}
📊 **Test Statistics**
- Total Tests: {{ctrf.summary.tests}}
- ✅ Passed: {{ctrf.summary.passed}}
- ❌ Failed: {{ctrf.summary.failed}}
- 🔄 Flaky Tests: {{countFlaky ctrf.tests}}

## Execution Details
{{!-- Show timing information --}}
⏱️ **Duration**: {{formatDurationFromTimes ctrf.summary.start ctrf.summary.stop}}
🔍 **Branch**: {{github.branchName}}
👤 **Triggered by**: {{github.actor}}

{{!-- Conditionally show failures if they exist --}}
{{#if ctrf.summary.failed}}
## Failed Tests
{{#each ctrf.tests}}
{{#if (eq this.status "failed")}}
#### ❌ {{this.name}}
{{/if}}
{{/each}}
{{/if}}
```

This template demonstrates:

- Using basic CTRF properties (`ctrf.summary.*`)
- Accessing GitHub context (`github.*`)
- Using helper functions (`countFlaky`, `formatDurationFromTimes`, `stripAnsi`)
- Conditional rendering with `{{#if}}` blocks
- Iterating over tests with `{{#each}}`

And what it looks like:

![Custom Report Example](../images/custom-one.png)

## Handlebars

Handlebars is a simple templating language that lets you insert data into your
markdown in a declarative way. You can use placeholders, conditionals, and loops
to dynamically generate content based on your test results.

## Helpers

When writing your template, you can use Handlebars helpers:

- `{{eq arg1 arg2}}`: Compares two arguments and returns true if they are equal.

See available helpers
[here](https://github.com/ctrf-io/handlebars-helpers-ctrf).

We welcome contributions for additional helpers.

## CTRF Properties

The `ctrf` object provides access to your test results data. Here are the main
properties:

### Summary (`ctrf.summary`)

- `tests`: Total number of tests
- `passed`: Number of passed tests
- `failed`: Number of failed tests
- `skipped`: Number of skipped tests
- `start`: Test suite start time
- `stop`: Test suite end time

### Individual Tests (`ctrf.tests`)

An array of test results, each containing:

- `name`: Test name
- `status`: Test status ("passed", "failed", "skipped")
- `message`: Test output/error message
- `duration`: Test duration in milliseconds
- `retries`: Number of retries (for flaky tests)

Example accessing test data:

```hbs
{{#each ctrf.tests}}
  Test: {{this.name}} - Status: {{this.status}}
{{/each}}
```

## GitHub Properties

GitHub properties are made available to use in your template. You can access
these properties by using the `github` property, for example `github.repoName`

You can access the entire context via the `github.context` property.

[Contexts](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs)
are a way to access information about workflow runs, variables, runner
environments, jobs, and steps. Each context is an object that contains
properties, which can be strings or other objects.

Contexts, objects, and properties will vary significantly under different
workflow run conditions. For example, the matrix context is only populated for
jobs in a matrix.

You can see the content of the context by printing it in the logs:

```yaml
- name: Print GitHub Context
  env:
    CONTEXT: ${{ toJson(github) }}
  run: echo "$CONTEXT" | jq .
```