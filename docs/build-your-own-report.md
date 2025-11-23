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

## Handlebars

Handlebars is a simple templating language that lets you insert data into your
markdown in a declarative way. You can use placeholders, conditionals, and loops
to dynamically generate content based on your test results.

## Helpers

When writing your template, you can use Handlebars helpers:

- `{{eq arg1 arg2}}`: Compares two arguments and returns true if they are equal.

See available helpers
[handlebars-helpers-ctrf repository](https://github.com/ctrf-io/handlebars-helpers-ctrf).

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

GitHub properties are made available to use in your template. You can access these properties by using the `github` property, for example `github.repoName` or `github.actor`.

### Root Context Properties

Access workflow and execution information:

**Workflow Information:**

- `github.workflow` - Name of the workflow
- `github.action` / `github.action_name` - Current action name
- `github.job` / `github.job_id` / `github.jobName` - Current job identifier
- `github.runNumber` / `github.run_number` - Unique number for each workflow run
- `github.runId` / `github.run_id` / `github.workflowId` - Unique identifier for the workflow run
- `github.workflowName` - Workflow name (legacy property)

**Event Information:**

- `github.eventName` / `github.event_name` - Event that triggered the workflow (e.g., "push", "pull_request")
- `github.actor` / `github.actor_name` / `github.actorName` - User who triggered the workflow
- `github.sha` - Commit SHA that triggered the workflow
- `github.ref` - Git ref that triggered the workflow (e.g., "refs/heads/main")
- `github.branchName` - Current branch name

**Repository & URLs:**

- `github.repoName` - Repository name
- `github.buildUrl` / `github.build_url` - URL to the workflow run summary
- `github.serverUrl` / `github.server_url` / `github.baseURL` - GitHub server URL (e.g., `https://github.com`)
- `github.apiUrl` / `github.api_url` - GitHub API URL (e.g., `https://api.github.com`)
- `github.graphqlUrl` / `github.graphql_url` - GitHub GraphQL API URL

**Pull Request (at root level):**

- `github.pullRequestNumber` - PR number (legacy property, prefer `github.pullRequest.number`)

### Repository Properties (`github.repository`)

Access repository information:

**Basic Info:**

- `github.repository.name` - Repository name
- `github.repository.fullName` / `github.repository.full_name` - Owner and repository name (e.g., "owner/repo")
- `github.repository.description` - Repository description
- `github.repository.language` - Primary language
- `github.repository.defaultBranch` / `github.repository.default_branch` - Default branch name
- `github.repository.licenseName` / `github.repository.license_name` - License name

**Statistics:**

- `github.repository.size` - Repository size in KB
- `github.repository.stargazersCount` / `github.repository.stargazers_count` - Number of stars
- `github.repository.openIssuesCount` / `github.repository.open_issues_count` - Number of open issues

**URLs:**

- `github.repository.htmlUrl` / `github.repository.html_url` - Repository URL
- `github.repository.cloneUrl` / `github.repository.clone_url` - HTTPS clone URL
- `github.repository.sshUrl` / `github.repository.ssh_url` - SSH clone URL
- `github.repository.compareUrl` / `github.repository.compare_url` - Compare URL
- `github.repository.contributorsUrl` / `github.repository.contributors_url` - Contributors page URL
- `github.repository.deploymentsUrl` / `github.repository.deployments_url` - Deployments URL
- `github.repository.downloadsUrl` / `github.repository.downloads_url` - Downloads URL
- `github.repository.eventsUrl` / `github.repository.events_url` - Events URL
- `github.repository.forksUrl` / `github.repository.forks_url` - Forks URL
- `github.repository.stargazersUrl` / `github.repository.stargazers_url` - Stargazers URL
- `github.repository.statusesUrl` / `github.repository.statuses_url` - Commit statuses URL
- `github.repository.subscriptionUrl` / `github.repository.subscription_url` - Subscription URL
- `github.repository.tagsUrl` / `github.repository.tags_url` - Tags URL
- `github.repository.teamsUrl` / `github.repository.teams_url` - Teams URL

**Settings:**

- `github.repository.allowForking` / `github.repository.allow_forking` - Whether forking is allowed
- `github.repository.createdAt` / `github.repository.created_at` - Repository creation timestamp

### Pull Request Properties (`github.pullRequest`)

Access pull request information (available when triggered by PR events):

**Basic Info:**

- `github.pullRequest.id` - PR ID
- `github.pullRequest.number` - PR number
- `github.pullRequest.title` - PR title
- `github.pullRequest.body` - PR description
- `github.pullRequest.state` - PR state ("open", "closed")
- `github.pullRequest.draft` - Whether PR is a draft (boolean)
- `github.pullRequest.rebaseable` - Whether PR can be rebased (boolean or null)

**Changes:**

- `github.pullRequest.additions` - Lines added
- `github.pullRequest.deletions` - Lines deleted
- `github.pullRequest.changedFiles` / `github.pullRequest.changed_files` - Number of files changed

**Collaboration:**

- `github.pullRequest.assignee` - Assigned user object (or null)
- `github.pullRequest.assignees` - Array of assigned users
- `github.pullRequest.authorAssociation` / `github.pullRequest.author_association` - Author's association with the repository
- `github.pullRequest.requestedReviewers` / `github.pullRequest.requested_reviewers` - Array of requested reviewers
- `github.pullRequest.requestedTeams` / `github.pullRequest.requested_teams` - Array of requested teams
- `github.pullRequest.comments` - Number of comments
- `github.pullRequest.reviewComments` / `github.pullRequest.review_comments` - Number of review comments
- `github.pullRequest.labels` - Array of labels

**URLs:**

- `github.pullRequest.htmlUrl` / `github.pullRequest.html_url` - PR URL
- `github.pullRequest.diffUrl` / `github.pullRequest.diff_url` - Diff URL
- `github.pullRequest.patchUrl` / `github.pullRequest.patch_url` - Patch URL

**Timestamps:**

- `github.pullRequest.createdAt` / `github.pullRequest.created_at` - Creation timestamp
- `github.pullRequest.closedAt` / `github.pullRequest.closed_at` - Closed timestamp (or null)
- `github.pullRequest.pushedAt` / `github.pullRequest.pushed_at` - Last push timestamp

**Merge Settings:**

- `github.pullRequest.autoMerge` / `github.pullRequest.auto_merge` - Auto-merge configuration (or null)

### Sender Properties (`github.sender`)

Access information about the user who triggered the workflow:

- `github.sender.login` - Username
- `github.sender.id` - User ID
- `github.sender.nodeId` / `github.sender.node_id` - Node ID
- `github.sender.type` - User type (e.g., "User", "Bot")
- `github.sender.siteAdmin` / `github.sender.site_admin` - Whether user is a site admin (boolean)
- `github.sender.htmlUrl` / `github.sender.html_url` - User profile URL
- `github.sender.avatarUrl` / `github.sender.avatar_url` - User avatar URL
- `github.sender.gravatarId` / `github.sender.gravatar_id` - Gravatar ID

### Full Context Access

You can access the complete webhook event payload via `github.context`. This contains the raw event payload data sent by GitHub when the workflow was triggered (e.g., the full `pull_request` object, `repository` object, `issue` object, etc. depending on the event type).

This is useful for accessing event-specific data that isn't exposed in the structured properties above. For example:

- `github.context.pull_request.head.ref` - Head branch name
- `github.context.pull_request.base.ref` - Base branch name
- `github.context.issue` - Issue data (for issue events)
- `github.context.comment` - Comment data (for comment events)

See the [GitHub Actions events documentation](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows) for available event types.

**Note:** Contexts, objects, and properties will vary significantly under different workflow run conditions. For example, pull request properties are only available when the workflow is triggered by a pull request event.

### Debugging Available Properties

To see all available properties for your specific workflow, print the context in your workflow logs:

```yaml
- name: Print GitHub Context
  env:
    CONTEXT: ${{ toJson(github) }}
  run: echo "$CONTEXT" | jq .
```
