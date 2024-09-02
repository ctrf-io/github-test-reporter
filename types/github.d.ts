export interface GitHub {
  repo?: string
  branch?: string
  runNumber?: string
  job?: string
  workflowId?: string
  workflow?: string
  actor?: string
  event?: string
  runId?: string
  apiUrl?: string
  baseUrl?: string
  pullRequestNumber?: number
  buildUrl: string
}
