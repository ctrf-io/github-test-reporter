import { CtrfReport } from '../types/ctrf';
import * as core from '@actions/core';
import { extractGithubProperties } from './common';
import https from 'https';

export function generateHistoricSummary(report: CtrfReport): void {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('GITHUB_TOKEN is not set. This is required for historical method');
        return;
    }

    const github = extractGithubProperties()
    fetchArtifactsFromPreviousBuilds()

    const workflowRun: CtrfReport[] = [
        report,
        {
            results: {
                tool: {
                    name: "jest"
                },
                summary: {
                    tests: 22,
                    passed: 16,
                    failed: 3,
                    pending: 1,
                    skipped: 1,
                    other: 1,
                    start: 1722511783500,
                    stop: 1722511794528
                },
                tests: [
                    {
                        name: "should be able to login",
                        status: "passed",
                        duration: 1200
                    }
                ]
            }
        },
        {
            results: {
                tool: {
                    name: "jest"
                },
                summary: {
                    tests: 10,
                    passed: 5,
                    failed: 3,
                    pending: 1,
                    skipped: 1,
                    other: 1,
                    start: 1722511783500,
                    stop: 1722511794528
                },
                tests: [
                    {
                        name: "should be able to login",
                        status: "passed",
                        duration: 1200
                    }
                ]
            }
        }
    ];

    const summaryRows = workflowRun.map((run) => {
        const { results } = run;
        const flakyCount = results.tests.filter((test) => test.flaky).length;
        const duration = results.summary.stop - results.summary.start;
        const durationFormatted = `${(duration / 1000).toFixed(2)} s`;

        return `| [#${github?.runNumber}](${github?.buildUrl}) | ${results.summary.tests} | ${results.summary.passed} | ${results.summary.failed} | ${results.summary.skipped} | ${results.summary.pending} | ${results.summary.other} | ${flakyCount} | ${durationFormatted} |`;
    });

    const summaryTable = `
| Build 🏗️ | Tests 📝 | Passed ✅ | Failed ❌ | Skipped ⏭️ | Pending ⏳ | Other ❓ | Flaky 🍂 | Duration ⏱️ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${summaryRows.join('\n')}
`;
    
    core.summary.addRaw(summaryTable).write();
}

function fetchArtifactsFromPreviousBuilds() {
    const github = extractGithubProperties();

    const apiUrl = `${github?.apiUrl}/repos/${github?.repo}/actions/runs?per_page=5`;

    const previousRuns = makeHttpsRequest(apiUrl, 'GET', null);

    const artifacts = previousRuns.workflow_runs.map((run: any) => {
        const artifactsUrl = run.artifacts_url;
        return makeHttpsRequest(artifactsUrl, 'GET', null);
    });

    return artifacts;
}

function makeHttpsRequest(
    url: string,
    method: 'GET' | 'POST' = 'GET',
    data: any = null,
): any {
    const token = process.env.GITHUB_TOKEN;
    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'github-actions-ctrf'
        }
    };

    const req = https.request(url, options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                console.log(responseData);
                return JSON.parse(responseData);
            } else {
                throw new Error(`Request failed with status code ${res.statusCode}: ${responseData}`);
            }
        });
    });

    req.on('error', (error) => {
        throw error;
    });

    if (data) {
        req.write(JSON.stringify(data));
    }

    req.end();
}