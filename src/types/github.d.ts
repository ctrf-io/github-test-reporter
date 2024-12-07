import * as github from '@actions/github'

export function getAllGitHubContext(): GitHubContext

export function getRootContext(): RootContext

export function getAdditionalContext(): AdditionalContext

export function getRepositoryContext(): RepositoryContext

export function getPullRequestContext(): PullRequestContext

export function getSenderContext(): SenderContext

export interface GitHubContext extends RootContext, AdditionalContext {
  repository: RepositoryContext
  pullRequest: PullRequestContext
  sender: SenderContext
}

export interface RootContext {
  action: string
  action_name: string
  actor: string
  actor_name: string
  eventName: string
  event_name: string
  sha: string
  ref: string
  workflow: string
  job: string
  job_id: string
  runNumber: number
  run_number: number
  runId: number
  run_id: number
  apiUrl: string
  api_url: string
  serverUrl: string
  server_url: string
  graphqlUrl: string
  graphql_url: string
}

export interface AdditionalContext {
  buildUrl: string
  build_url: string
}

export interface RepositoryContext {
  cloneUrl: string
  clone_url: string
  createdAt: string
  created_at: string
  defaultBranch: string
  default_branch: string
  description: string | null
  fullName: string
  full_name: string
  htmlUrl: string
  html_url: string
  language: string | null
  licenseName: string | null
  license_name: string | null
  name: string
  openIssuesCount: number
  open_issues_count: number
  size: number
  stargazersCount: number
  stargazers_count: number
  allowForking: boolean
  allow_forking: boolean
  compareUrl: string
  compare_url: string
  contributorsUrl: string
  contributors_url: string
  deploymentsUrl: string
  deployments_url: string
  downloadsUrl: string
  downloads_url: string
  eventsUrl: string
  events_url: string
  forksUrl: string
  forks_url: string
  sshUrl: string
  ssh_url: string
  stargazersUrl: string
  stargazers_url: string
  statusesUrl: string
  statuses_url: string
  subscriptionUrl: string
  subscription_url: string
  tagsUrl: string
  tags_url: string
  teamsUrl: string
  teams_url: string
}

export interface PullRequestContext {
  additions: number
  assignee: github.GitHubUser | null
  assignees: github.GitHubUser[]
  authorAssociation: string
  author_association: string
  autoMerge: any
  auto_merge: any
  pushedAt: string
  pushed_at: string
  body: string | null
  changedFiles: number
  changed_files: number
  closedAt: string | null
  closed_at: string | null
  comments: number
  createdAt: string
  created_at: string
  deletions: number
  diffUrl: string
  diff_url: string
  draft: boolean
  htmlUrl: string
  html_url: string
  id: number
  labels: github.GitHubLabel[]
  number: number
  patchUrl: string
  patch_url: string
  rebaseable: boolean | null
  requestedReviewers: github.GitHubUser[]
  requested_reviewers: github.GitHubUser[]
  requestedTeams: github.GitHubTeam[]
  requested_teams: github.GitHubTeam[]
  reviewComments: number
  review_comments: number
  state: string
  title: string
}

export interface SenderContext {
  login: string
  id: number
  nodeId: string
  node_id: string
  avatarUrl: string
  avatar_url: string
  gravatarId: string
  gravatar_id: string
  htmlUrl: string
  html_url: string
  type: string
  siteAdmin: boolean
  site_admin: boolean
}
