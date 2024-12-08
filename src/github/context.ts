import { context } from '@actions/github'
import {
  GitHubAdditionalContext,
  GitHubContext,
  GitHubPullRequestContext,
  GitHubRepositoryContext,
  GitHubRootContext,
  GitHubSenderContext
} from 'src/types'

/**
 * Retrieves the full GitHub context by aggregating data from various sources,
 * including root, additional, repository, pull request, and sender contexts.
 *
 * @returns A `GitHubContext` object containing comprehensive GitHub context data.
 */
export function getAllGitHubContext(): GitHubContext {
  const root = getRootContext()
  const additional = getAdditionalContext()
  const repository = getRepositoryContext()
  const pullRequest = getPullRequestContext()
  const sender = getSenderContext()

  return {
    ...root,
    ...additional,
    repository,
    pullRequest,
    sender
  }
}

/**
 * Extracts the root context from the GitHub Actions environment.
 *
 * @returns A `GitHubRootContext` object containing core workflow-related information.
 */
function getRootContext(): GitHubRootContext {
  return {
    action: context.action || '',
    action_name: context.action || '',
    actor: context.actor || '',
    actor_name: context.actor || '',
    eventName: context.eventName || '',
    event_name: context.eventName || '',
    sha: context.sha || '',
    ref: context.ref || '',
    workflow: context.workflow || '',
    job: context.job || '',
    job_id: context.job || '',
    runNumber: context.runNumber || 0,
    run_number: context.runNumber || 0,
    runId: context.runId || 0,
    run_id: context.runId || 0,
    apiUrl: context.apiUrl || '',
    api_url: context.apiUrl || '',
    serverUrl: context.serverUrl || '',
    server_url: context.serverUrl || '',
    graphqlUrl: context.graphqlUrl || '',
    graphql_url: context.graphqlUrl || '',
    repoName: context.payload.repository?.name || '',
    build_url: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}#summary`,

    // CLI-specific legacy properties
    jobName: context.job || '',
    workflowId: context.runId || 0,
    workflowName: context.workflow || '',
    actorName: context.actor || '',
    pullRequestNumber: context.payload.pull_request?.number || null,
    baseURL: context.serverUrl || ''
  }
}

/**
 * Retrieves additional GitHub context details, including derived URLs and branch names.
 *
 * @returns A `GitHubAdditionalContext` object with additional context data.
 */
function getAdditionalContext(): GitHubAdditionalContext {
  const buildUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}#summary`

  return {
    buildUrl,
    build_url: buildUrl,
    branchName: process.env.GITHUB_REF_NAME || ''
  }
}

/**
 * Extracts repository-specific context information from the GitHub Actions environment.
 *
 * @returns A `GitHubRepositoryContext` object containing repository details.
 */
function getRepositoryContext(): GitHubRepositoryContext {
  const repo = context.payload.repository as GitHubRepositoryContext | undefined

  return repo
    ? {
        cloneUrl: repo.clone_url || '',
        clone_url: repo.clone_url || '',
        createdAt: repo.created_at || '',
        created_at: repo.created_at || '',
        defaultBranch: repo.default_branch || '',
        default_branch: repo.default_branch || '',
        description: repo.description || null,
        fullName: repo.full_name || '',
        full_name: repo.full_name || '',
        htmlUrl: repo.html_url || '',
        html_url: repo.html_url || '',
        language: repo.language || null,
        licenseName: repo.licenseName || null,
        license_name: repo.licenseName || null,
        name: repo.name || '',
        openIssuesCount: repo.open_issues_count || 0,
        open_issues_count: repo.open_issues_count || 0,
        size: repo.size || 0,
        stargazersCount: repo.stargazers_count || 0,
        stargazers_count: repo.stargazers_count || 0,
        allowForking: repo.allow_forking || false,
        allow_forking: repo.allow_forking || false,
        compareUrl: convertApiUrlToHtml(repo.compare_url || '', {
          base: 'main',
          head: context.sha
        }),
        compare_url: convertApiUrlToHtml(repo.compare_url || '', {
          base: 'main',
          head: context.sha
        }),
        contributorsUrl: convertApiUrlToHtml(repo.contributors_url || ''),
        contributors_url: convertApiUrlToHtml(repo.contributors_url || ''),
        deploymentsUrl: convertApiUrlToHtml(repo.deployments_url || ''),
        deployments_url: convertApiUrlToHtml(repo.deployments_url || ''),
        downloadsUrl: convertApiUrlToHtml(repo.downloads_url || ''),
        downloads_url: convertApiUrlToHtml(repo.downloads_url || ''),
        eventsUrl: convertApiUrlToHtml(repo.events_url || ''),
        events_url: convertApiUrlToHtml(repo.events_url || ''),
        forksUrl: convertApiUrlToHtml(repo.forks_url || ''),
        forks_url: convertApiUrlToHtml(repo.forks_url || ''),
        sshUrl: repo.ssh_url || '',
        ssh_url: repo.ssh_url || '',
        stargazersUrl: convertApiUrlToHtml(repo.stargazers_url || ''),
        stargazers_url: convertApiUrlToHtml(repo.stargazers_url || ''),
        statusesUrl: convertApiUrlToHtml(repo.statuses_url || '', {
          sha: context.sha
        }),
        statuses_url: convertApiUrlToHtml(repo.statuses_url || '', {
          sha: context.sha
        }),
        subscriptionUrl: convertApiUrlToHtml(repo.subscription_url || ''),
        subscription_url: convertApiUrlToHtml(repo.subscription_url || ''),
        tagsUrl: convertApiUrlToHtml(repo.tags_url || ''),
        tags_url: convertApiUrlToHtml(repo.tags_url || ''),
        teamsUrl: convertApiUrlToHtml(repo.teams_url || ''),
        teams_url: convertApiUrlToHtml(repo.teams_url || '')
      }
    : {
        cloneUrl: '',
        clone_url: '',
        createdAt: '',
        created_at: '',
        defaultBranch: '',
        default_branch: '',
        description: null,
        fullName: '',
        full_name: '',
        htmlUrl: '',
        html_url: '',
        language: null,
        licenseName: null,
        license_name: null,
        name: '',
        openIssuesCount: 0,
        open_issues_count: 0,
        size: 0,
        stargazersCount: 0,
        stargazers_count: 0,
        allowForking: false,
        allow_forking: false,
        compareUrl: '',
        compare_url: '',
        contributorsUrl: '',
        contributors_url: '',
        deploymentsUrl: '',
        deployments_url: '',
        downloadsUrl: '',
        downloads_url: '',
        eventsUrl: '',
        events_url: '',
        forksUrl: '',
        forks_url: '',
        sshUrl: '',
        ssh_url: '',
        stargazersUrl: '',
        stargazers_url: '',
        statusesUrl: '',
        statuses_url: '',
        subscriptionUrl: '',
        subscription_url: '',
        tagsUrl: '',
        tags_url: '',
        teamsUrl: '',
        teams_url: ''
      }
}

/**
 * Extracts pull request-specific context information from the GitHub Actions environment.
 *
 * @returns A `GitHubPullRequestContext` object containing pull request details.
 */
function getPullRequestContext(): GitHubPullRequestContext {
  const pr = context.payload.pull_request as
    | GitHubPullRequestContext
    | undefined

  return pr
    ? {
        additions: pr.additions ?? 0,
        assignee: pr.assignee ?? null,
        assignees: pr.assignees ?? [],
        authorAssociation: pr.author_association ?? '',
        author_association: pr.author_association ?? '',
        autoMerge: pr.auto_merge ?? null,
        auto_merge: pr.auto_merge ?? null,
        pushedAt: pr.pushed_at ?? '',
        pushed_at: pr.pushed_at ?? '',
        body: pr.body ?? null,
        changedFiles: pr.changed_files ?? 0,
        changed_files: pr.changed_files ?? 0,
        closedAt: pr.closed_at ?? null,
        closed_at: pr.closed_at ?? null,
        comments: pr.comments ?? 0,
        createdAt: pr.created_at ?? '',
        created_at: pr.created_at ?? '',
        deletions: pr.deletions ?? 0,
        diffUrl: pr.diff_url ?? '',
        diff_url: pr.diff_url ?? '',
        draft: pr.draft ?? false,
        htmlUrl: pr.html_url ?? '',
        html_url: pr.html_url ?? '',
        id: pr.id ?? 0,
        labels: pr.labels ?? [],
        number: pr.number ?? 0,
        patchUrl: pr.patch_url ?? '',
        patch_url: pr.patch_url ?? '',
        rebaseable: pr.rebaseable ?? null,
        requestedReviewers: pr.requested_reviewers ?? [],
        requested_reviewers: pr.requested_reviewers ?? [],
        requestedTeams: pr.requested_teams ?? [],
        requested_teams: pr.requested_teams ?? [],
        reviewComments: pr.review_comments ?? 0,
        review_comments: pr.review_comments ?? 0,
        state: pr.state ?? '',
        title: pr.title ?? ''
      }
    : {
        additions: 0,
        assignee: null,
        assignees: [],
        authorAssociation: '',
        author_association: '',
        autoMerge: null,
        auto_merge: null,
        pushedAt: '',
        pushed_at: '',
        body: null,
        changedFiles: 0,
        changed_files: 0,
        closedAt: null,
        closed_at: null,
        comments: 0,
        createdAt: '',
        created_at: '',
        deletions: 0,
        diffUrl: '',
        diff_url: '',
        draft: false,
        htmlUrl: '',
        html_url: '',
        id: 0,
        labels: [],
        number: 0,
        patchUrl: '',
        patch_url: '',
        rebaseable: null,
        requestedReviewers: [],
        requested_reviewers: [],
        requestedTeams: [],
        requested_teams: [],
        reviewComments: 0,
        review_comments: 0,
        state: '',
        title: ''
      }
}

/**
 * Extracts sender-specific context information from the GitHub Actions environment.
 *
 * @returns A `GitHubSenderContext` object containing sender details.
 */
function getSenderContext(): GitHubSenderContext {
  const sender = context.payload.sender as GitHubSenderContext | undefined

  return sender
    ? {
        login: sender.login,
        id: sender.id,
        nodeId: sender.node_id,
        node_id: sender.node_id,
        avatarUrl: sender.avatar_url,
        avatar_url: sender.avatar_url,
        gravatarId: sender.gravatar_id,
        gravatar_id: sender.gravatar_id,
        htmlUrl: sender.html_url,
        html_url: sender.html_url,
        type: sender.type,
        siteAdmin: sender.site_admin,
        site_admin: sender.site_admin
      }
    : {
        login: '',
        id: 0,
        nodeId: '',
        node_id: '',
        avatarUrl: '',
        avatar_url: '',
        gravatarId: '',
        gravatar_id: '',
        htmlUrl: '',
        html_url: '',
        type: 'Unknown',
        siteAdmin: false,
        site_admin: false
      }
}

/**
 * Converts a GitHub API URL into a human-readable HTML URL.
 *
 * @param apiUrl - The GitHub API URL to convert.
 * @param placeholders - A record of placeholders to replace in the URL (e.g., `{base: 'main', head: 'sha'}`).
 * @returns The converted HTML URL.
 */
function convertApiUrlToHtml(
  apiUrl: string,
  placeholders: Record<string, string> = {}
): string {
  if (!apiUrl) return ''
  let url = apiUrl.replace('https://api.github.com/repos', 'https://github.com')

  for (const [key, value] of Object.entries(placeholders)) {
    if (value) {
      url = url.replace(new RegExp(`(/?\\{${key}\\})`, 'g'), `/${value}`)
    }
  }

  return url.replace(/\/\{.*?\}/g, '')
}
