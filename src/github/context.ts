import { context } from '@actions/github'

export function getAllGitHubContext(): any {
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

function getRootContext(): any {
  return {
    action: context.action,
    action_name: context.action,
    actor: context.actor,
    actor_name: context.actor,
    eventName: context.eventName,
    event_name: context.eventName,
    sha: context.sha,
    ref: context.ref,
    workflow: context.workflow,
    job: context.job,
    job_id: context.job,
    runNumber: context.runNumber,
    run_number: context.runNumber,
    runId: context.runId,
    run_id: context.runId,
    apiUrl: context.apiUrl,
    api_url: context.apiUrl,
    serverUrl: context.serverUrl,
    server_url: context.serverUrl,
    graphqlUrl: context.graphqlUrl,
    graphql_url: context.graphqlUrl,
    repoName: context.payload.repository?.name,

    // CLI-specific legacy properties
    jobName: context.job,
    workflowID: context.runId,
    workflowName: context.workflow,
    actorName: context.actor,
    pullRequestNumber: context.payload.pull_request?.number || null,
    baseURL: context.serverUrl
  }
}

function getAdditionalContext(): any {
  const buildUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}#summary`

  return {
    buildUrl,
    build_url: buildUrl,
    branchName: process.env.GITHUB_REF_NAME
  }
}

function getRepositoryContext(): any {
  const repo = context.payload.repository
  return repo
    ? {
        cloneUrl: repo.clone_url,
        clone_url: repo.clone_url,
        createdAt: repo.created_at,
        created_at: repo.created_at,
        defaultBranch: repo.default_branch,
        default_branch: repo.default_branch,
        description: repo.description,
        fullName: repo.full_name,
        full_name: repo.full_name,
        htmlUrl: repo.html_url,
        html_url: repo.html_url,
        language: repo.language,
        licenseName: repo.license?.name,
        license_name: repo.license?.name,
        name: repo.name,
        openIssuesCount: repo.open_issues_count,
        open_issues_count: repo.open_issues_count,
        size: repo.size,
        stargazersCount: repo.stargazers_count,
        stargazers_count: repo.stargazers_count,
        allowForking: repo.allow_forking,
        allow_forking: repo.allow_forking,
        // archiveUrl: convertApiUrlToHtml(repo.archive_url),
        // archive_url: convertApiUrlToHtml(repo.archive_url),
        // assigneesUrl: convertApiUrlToHtml(repo.assignees_url, {
        //   user: context.actor
        // }),
        // assignees_url: convertApiUrlToHtml(repo.assignees_url, {
        //   user: context.actor
        // }),
        // blobsUrl: convertApiUrlToHtml(repo.blobs_url, { sha: context.sha }),
        // blobs_url: convertApiUrlToHtml(repo.blobs_url, { sha: context.sha }),
        // branchesUrl: convertApiUrlToHtml(repo.branches_url, {
        //   branch: context.ref
        // }),
        // branches_url: convertApiUrlToHtml(repo.branches_url, {
        //   branch: context.ref
        // }),
        // commentsUrl: convertApiUrlToHtml(repo.comments_url, {
        //   number: context.runNumber.toString()
        // }),
        // comments_url: convertApiUrlToHtml(repo.comments_url, {
        //   number: context.runNumber.toString()
        // }),
        // commitsUrl: convertApiUrlToHtml(repo.commits_url, { sha: context.sha }),
        // commits_url: convertApiUrlToHtml(repo.commits_url, {
        //   sha: context.sha
        // }),
        compareUrl: convertApiUrlToHtml(repo.compare_url, {
          base: 'main',
          head: context.sha
        }),
        compare_url: convertApiUrlToHtml(repo.compare_url, {
          base: 'main',
          head: context.sha
        }),
        // contentsUrl: convertApiUrlToHtml(repo.contents_url, { '+path': '' }),
        // contents_url: convertApiUrlToHtml(repo.contents_url, { '+path': '' }),
        contributorsUrl: convertApiUrlToHtml(repo.contributors_url),
        contributors_url: convertApiUrlToHtml(repo.contributors_url),
        deploymentsUrl: convertApiUrlToHtml(repo.deployments_url),
        deployments_url: convertApiUrlToHtml(repo.deployments_url),
        downloadsUrl: convertApiUrlToHtml(repo.downloads_url),
        downloads_url: convertApiUrlToHtml(repo.downloads_url),
        eventsUrl: convertApiUrlToHtml(repo.events_url),
        events_url: convertApiUrlToHtml(repo.events_url),
        forksUrl: convertApiUrlToHtml(repo.forks_url),
        forks_url: convertApiUrlToHtml(repo.forks_url),
        // gitCommitsUrl: convertApiUrlToHtml(repo.git_commits_url, {
        //   sha: context.sha
        // }),
        // git_commits_url: convertApiUrlToHtml(repo.git_commits_url, {
        //   sha: context.sha
        // }),
        // gitRefsUrl: convertApiUrlToHtml(repo.git_refs_url, {
        //   sha: context.sha
        // }),
        // git_refs_url: convertApiUrlToHtml(repo.git_refs_url, {
        //   sha: context.sha
        // }),
        // gitTagsUrl: convertApiUrlToHtml(repo.git_tags_url, {
        //   sha: context.sha
        // }),
        // git_tags_url: convertApiUrlToHtml(repo.git_tags_url, {
        //   sha: context.sha
        // }),
        // hooksUrl: convertApiUrlToHtml(repo.hooks_url),
        // hooks_url: convertApiUrlToHtml(repo.hooks_url),
        // issueCommentUrl: convertApiUrlToHtml(repo.issue_comment_url, {
        //   number: context.runNumber.toString()
        // }),
        // issue_comment_url: convertApiUrlToHtml(repo.issue_comment_url, {
        //   number: context.runNumber.toString()
        // }),
        // issueEventsUrl: convertApiUrlToHtml(repo.issue_events_url, {
        //   number: context.runNumber.toString()
        // }),
        // issue_events_url: convertApiUrlToHtml(repo.issue_events_url, {
        //   number: context.runNumber.toString()
        // }),
        // issuesUrl: convertApiUrlToHtml(repo.issues_url, {
        //   number: context.runNumber.toString()
        // }),
        // issues_url: convertApiUrlToHtml(repo.issues_url, {
        //   number: context.runNumber.toString()
        // }),
        // keysUrl: convertApiUrlToHtml(repo.keys_url, { key_id: 'example' }),
        // keys_url: convertApiUrlToHtml(repo.keys_url, { key_id: 'example' }),
        // labelsUrl: convertApiUrlToHtml(repo.labels_url, { name: 'bug' }),
        // labels_url: convertApiUrlToHtml(repo.labels_url, { name: 'bug' }),
        // languagesUrl: convertApiUrlToHtml(repo.languages_url),
        // languages_url: convertApiUrlToHtml(repo.languages_url),
        // mergesUrl: convertApiUrlToHtml(repo.merges_url),
        // merges_url: convertApiUrlToHtml(repo.merges_url),
        // milestonesUrl: convertApiUrlToHtml(repo.milestones_url, {
        //   number: '1'
        // }),
        // milestones_url: convertApiUrlToHtml(repo.milestones_url, {
        //   number: '1'
        // }),
        // notificationsUrl: convertApiUrlToHtml(repo.notifications_url),
        // notifications_url: convertApiUrlToHtml(repo.notifications_url),
        // pullsUrl: convertApiUrlToHtml(repo.pulls_url, {
        //   number: context.runNumber.toString()
        // }),
        // pulls_url: convertApiUrlToHtml(repo.pulls_url, {
        //   number: context.runNumber.toString()
        // }),
        // releasesUrl: convertApiUrlToHtml(repo.releases_url, { id: 'latest' }),
        // releases_url: convertApiUrlToHtml(repo.releases_url, { id: 'latest' }),
        sshUrl: repo.ssh_url,
        ssh_url: repo.ssh_url,
        stargazersUrl: convertApiUrlToHtml(repo.stargazers_url),
        stargazers_url: convertApiUrlToHtml(repo.stargazers_url),
        statusesUrl: convertApiUrlToHtml(repo.statuses_url, {
          sha: context.sha
        }),
        // statuses_url: convertApiUrlToHtml(repo.statuses_url, {
        //   sha: context.sha
        // }),
        // subscribersUrl: convertApiUrlToHtml(repo.subscribers_url),
        // subscribers_url: convertApiUrlToHtml(repo.subscribers_url),
        subscriptionUrl: convertApiUrlToHtml(repo.subscription_url),
        subscription_url: convertApiUrlToHtml(repo.subscription_url),
        tagsUrl: convertApiUrlToHtml(repo.tags_url),
        tags_url: convertApiUrlToHtml(repo.tags_url),
        teamsUrl: convertApiUrlToHtml(repo.teams_url),
        teams_url: convertApiUrlToHtml(repo.teams_url)
        // treesUrl: convertApiUrlToHtml(repo.trees_url, { sha: context.sha }),
        // trees_url: convertApiUrlToHtml(repo.trees_url, { sha: context.sha })
      }
    : {}
}

function getPullRequestContext(): any {
  const pr = context.payload.pull_request
  return pr
    ? {
        additions: pr.additions,
        assignee: pr.assignee,
        assignees: pr.assignees,
        authorAssociation: pr.author_association,
        author_association: pr.author_association,
        autoMerge: pr.auto_merge,
        auto_merge: pr.auto_merge,
        pushedAt: pr.pushed_at,
        pushed_at: pr.pushed_at,
        body: pr.body,
        changedFiles: pr.changed_files,
        changed_files: pr.changed_files,
        closedAt: pr.closed_at,
        closed_at: pr.closed_at,
        comments: pr.comments,
        // commentsUrl: convertApiUrlToHtml(pr.comments_url, {
        //   number: pr.number.toString()
        // }),
        // comments_url: convertApiUrlToHtml(pr.comments_url, {
        //   number: pr.number.toString()
        // }),
        // commits: pr.commits,
        // commitsUrl: convertApiUrlToHtml(pr.commits_url, {
        //   number: pr.number.toString()
        // }),
        // commits_url: convertApiUrlToHtml(pr.commits_url, {
        //   number: pr.number.toString()
        // }),
        createdAt: pr.created_at,
        created_at: pr.created_at,
        deletions: pr.deletions,
        diffUrl: pr.diff_url,
        diff_url: pr.diff_url,
        draft: pr.draft,
        htmlUrl: pr.html_url,
        html_url: pr.html_url,
        id: pr.id,
        labels: pr.labels,
        number: pr.number,
        patchUrl: pr.patch_url,
        patch_url: pr.patch_url,
        rebaseable: pr.rebaseable,
        requestedReviewers: pr.requested_reviewers,
        requested_reviewers: pr.requested_reviewers,
        requestedTeams: pr.requested_teams,
        requested_teams: pr.requested_teams,
        reviewComments: pr.review_comments,
        review_comments: pr.review_comments,
        // reviewCommentsUrl: convertApiUrlToHtml(pr.review_comments_url, {
        //   number: pr.number.toString()
        // }),
        // review_comments_url: convertApiUrlToHtml(pr.review_comments_url, {
        //   number: pr.number.toString()
        // }),
        state: pr.state,
        title: pr.title
        // statusesUrl: convertApiUrlToHtml(pr.statuses_url, { sha: context.sha }),
        // statuses_url: convertApiUrlToHtml(pr.statuses_url, { sha: context.sha })
      }
    : {}
}

function getSenderContext(): any {
  const sender = context.payload.sender
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
        // url: sender.url,
        htmlUrl: sender.html_url,
        html_url: sender.html_url,
        // followersUrl: sender.followers_url,
        // followers_url: sender.followers_url,
        // followingUrl: sender.following_url,
        // following_url: sender.following_url,
        // gistsUrl: sender.gists_url,
        // gists_url: sender.gists_url,
        // starredUrl: sender.starred_url,
        // starred_url: sender.starred_url,
        // subscriptionsUrl: sender.subscriptions_url,
        // subscriptions_url: sender.subscriptions_url,
        // organizationsUrl: sender.organizations_url,
        // organizations_url: sender.organizations_url,
        // reposUrl: sender.repos_url,
        // repos_url: sender.repos_url,
        // eventsUrl: sender.events_url,
        // events_url: sender.events_url,
        // receivedEventsUrl: sender.received_events_url,
        // received_events_url: sender.received_events_url,
        type: sender.type,
        siteAdmin: sender.site_admin,
        site_admin: sender.site_admin
      }
    : {}
}

/**
 * Helper function to convert an API URL to a GitHub web URL.
 * Replaces placeholders in the URL with context values for dynamic URL generation.
 */
function convertApiUrlToHtml(
  apiUrl: string,
  placeholders: Record<string, string> = {}
): string {
  let url = apiUrl.replace('https://api.github.com/repos', 'https://github.com')

  // Replace placeholders, whether preceded by a / or not
  for (const [key, value] of Object.entries(placeholders)) {
    url = url.replace(new RegExp(`(/?\\{${key}\\})`, 'g'), `/${value}`)
  }

  return url.replace(/\/\{.*?\}/g, '') // Remove any remaining placeholders
}
