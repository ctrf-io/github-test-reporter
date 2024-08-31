import fs from 'fs';

export function extractGithubProperties() {
    const eventPath = process.env.GITHUB_EVENT_PATH;

    if (!eventPath) {
        console.error('GITHUB_EVENT_PATH is not set. This is required to determine context.');
        return;
    }

    let context;
    try {
        const eventData = fs.readFileSync(eventPath, 'utf8');
        context = JSON.parse(eventData);
    } catch (error) {
        console.error('Failed to read or parse event data:', error);
        return;
    }

    const {
        GITHUB_REPOSITORY: repo,
        GITHUB_REF_NAME: branch,
        GITHUB_RUN_NUMBER: runNumber,
        GITHUB_JOB: job,
        GITHUB_WORKFLOW: workflow,
        GITHUB_TRIGGERING_ACTOR: actor,
        GITHUB_EVENT_NAME: event, // push or pull_request
        GITHUB_RUN_ID: runId,
        GITHUB_API_URL: apiUrl,
        GITHUB_SERVER_URL: baseUrl
    } = process.env;

    const pullRequest = context.pull_request?.number;
    const buildUrl = `${baseUrl}/${repo}/actions/runs/${runId}#summary`;

    return {
        repo,
        branch,
        runNumber,
        job,
        workflow,
        actor,
        event,
        runId,
        pullRequest,
        apiUrl,
        baseUrl,
        buildUrl
    };
}