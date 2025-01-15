# Build Your Own Report

Creating a Handlebars markdown template allows you to have full control over how
your test results are displayed. With Handlebars and CTRF, you can inject
dynamic content into your markdown files, making your summaries flexible and
informative.

## Handlebars Basics

Handlebars is a simple templating language that lets you insert data into your
markdown in a declarative way. You can use placeholders, conditionals, and loops
to dynamically generate content based on your test results.

## Example of a Simple Handlebars Template

Here's a basic example of a Handlebars markdown template that you might use to
generate a custom summary:

```hbs
# Custom Test Summary **Total Tests**:
{{ctrf.summary.tests}}
**Passed**:
{{ctrf.summary.passed}}
**Failed**:
{{ctrf.summary.failed}}
**Flaky Tests**:
{{countFlaky ctrf.tests}}
**Duration**:
{{formatDuration ctrf.summary.start ctrf.results.summary.stop}}
```

## Special Handlebars Helpers

When writing your template, you can use several special Handlebars helpers:

- `{{countFlaky ctrf.tests}}`: Counts and returns the number of flaky tests.

- `{{formatDuration ctrf.summary.start ctrf.summary.stop}}`: Formats the
  duration between start and stop times into a human-readable string.

- `{{stripAnsi message}}`: Strips ANSI from string, useful for when error
  messages contain ANSI characters.

- `{{eq arg1 arg2}}`: Compares two arguments and returns true if they are equal.

See available helpers [here](src/handlebars/helpers).

We welcome contributions for additional helpers.

## Available Properties

All CTRF properties are accessible via the ctrf property in your template.

Additionally, you can access properties from GitHub using the github property.
The following GitHub properties are available:

- `github.repoName`: The name of the repository.
- `github.branchName`: The current branch being worked on or checked out.
- `github.runNumber`: The unique number assigned to each run in the workflow.
  Increments with every run.
- `github.jobName`: The name of the specific job being executed within the
  workflow.
- `github.workflowID`: The unique ID assigned to the workflow, providing a way
  to track it.
- `github.workflowName`: The name of the workflow being executed.
- `github.actorName`: The user or entity responsible for triggering the
  workflow. This could be a human user or a bot.
- `github.eventName`: The event that triggered the workflow (e.g., push,
  pull_request, schedule).
- `github.runID`: A unique ID representing the run of the workflow for
  traceability.
- `github.pullRequestNumber`: The number associated with the pull request if the
  event triggering the workflow is a pull request.
- `github.apiURL`: The base URL for accessing the repository’s API.
- `github.baseURL`: The root URL of the repository.
- `github.buildURL`: The URL for the build, typically where you can view build
  logs and details.
