import { createGitHubClient } from '.'

/**
 * Creates a check run for a specific commit.
 *
 * @param owner - The owner of the repository (organization or user).
 * @param repo - The name of the repository.
 * @param sha - The SHA of the commit to update.
 * @param name - The name of the check run.
 * @param status - The current status ('queued' | 'in_progress' | 'completed').
 * @param conclusion - The final conclusion ('success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required').
 * @param title - The title of the check run.
 * @param summary - A summary of the check run.
 * @param detailsUrl - The URL of the integrator's site that has the full details of the check.
 *
 * @returns A promise that resolves to the response data from GitHub's API.
 */
export async function createCheckRun(
  owner: string,
  repo: string,
  sha: string,
  name: string,
  status: 'queued' | 'in_progress' | 'completed',
  conclusion?:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required',
  title?: string,
  summary?: string,
  detailsUrl?: string
): Promise<void> {
  const octokit = await createGitHubClient()
  await octokit.checks.create({
    owner,
    repo,
    head_sha: sha,
    name,
    status,
    conclusion,
    output:
      title && summary
        ? {
            title,
            summary
          }
        : undefined,
    details_url: detailsUrl
  })
}
