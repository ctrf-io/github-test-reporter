import fs from 'fs';
import { CtrfReport } from '../types/ctrf';
import * as core from '@actions/core';

export function generateHistoricSummary(report: CtrfReport): void {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('GITHUB_TOKEN is not set. This is required for historical method');
        return;
    }

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

    const repo = process.env.GITHUB_REPOSITORY;
    const branch = process.env.GITHUB_REF_NAME;
    const runNumber = process.env.GITHUB_RUN_NUMBER;
    const job = process.env.GITHUB_JOB;
    const workflow = process.env.GITHUB_WORKFLOW;
    const actor = process.env.GITHUB_TRIGGERING_ACTOR;
    const event = process.env.GITHUB_EVENT_NAME; // push or pull_request
    const runId = process.env.GITHUB_RUN_ID;
    const pullRequest = context.pull_request?.number;
    const apiUrl = process.env.GITHUB_API_URL;
    const baseUrl = process.env.GITHUB_SERVER_URL;
    const buildUrl = `${baseUrl}/${repo}/actions/runs/${runId}#summary`;

    const workflowRun: CtrfReport[] = [
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
                    },
                    {
                        name: "should display profile information",
                        status: "failed",
                        duration: 800,
                        message: "Assertion Failure: profile mismatch",
                        trace: "ProfileTest.js:45"
                    },
                    {
                        name: "should be able to update profile",
                        status: "passed",
                        duration: 1200,
                        flaky: true,
                        retries: 2
                    },
                    {
                        name: "should be able to logout",
                        status: "skipped",
                        duration: 0
                    },
                    {
                        name: "should validate user settings",
                        status: "passed",
                        duration: 1100
                    },
                    {
                        name: "should fail to update profile on network failure",
                        status: "failed",
                        duration: 900,
                        message: "Network Timeout",
                        trace: "ProfileUpdateTest.js:60"
                    },
                    {
                        name: "should fail to update profile on network failure",
                        status: "failed",
                        duration: 900
                    },
                    {
                        name: "should load user data",
                        status: "pending",
                        duration: 0
                    },
                    {
                        name: "should handle session timeouts",
                        status: "passed",
                        duration: 950,
                        flaky: true,
                        retries: 1
                    },
                    {
                        name: "should clean up user session on logout",
                        status: "other",
                        duration: 1050
                    },
                    {
                        name: "should allow user to change password",
                        status: "passed",
                        duration: 1300,
                        flaky: true,
                        retries: 3
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
                    },
                    {
                        name: "should display profile information",
                        status: "failed",
                        duration: 800,
                        message: "Assertion Failure: profile mismatch",
                        trace: "ProfileTest.js:45"
                    },
                    {
                        name: "should be able to update profile",
                        status: "passed",
                        duration: 1200,
                        flaky: true,
                        retries: 2
                    },
                    {
                        name: "should be able to logout",
                        status: "skipped",
                        duration: 0
                    },
                    {
                        name: "should validate user settings",
                        status: "passed",
                        duration: 1100
                    },
                    {
                        name: "should fail to update profile on network failure",
                        status: "failed",
                        duration: 900,
                        message: "Network Timeout",
                        trace: "ProfileUpdateTest.js:60"
                    },
                    {
                        name: "should fail to update profile on network failure",
                        status: "failed",
                        duration: 900
                    },
                    {
                        name: "should load user data",
                        status: "pending",
                        duration: 0
                    },
                    {
                        name: "should handle session timeouts",
                        status: "passed",
                        duration: 950,
                        flaky: true,
                        retries: 1
                    },
                    {
                        name: "should clean up user session on logout",
                        status: "other",
                        duration: 1050
                    },
                    {
                        name: "should allow user to change password",
                        status: "passed",
                        duration: 1300,
                        flaky: true,
                        retries: 3
                    }
                ]
            }
        }
    ];

    // Create the table rows with build info and test results
    const summaryRows = workflowRun.map((run) => {
        const { results } = run;
        const flakyCount = results.tests.filter((test) => test.flaky).length;
        const duration = results.summary.stop - results.summary.start;
        const durationFormatted = `${(duration / 1000).toFixed(2)} s`;

        return `| [Build #${runNumber}](${buildUrl}) | ${results.summary.tests} | ${results.summary.passed} | ${results.summary.failed} | ${results.summary.skipped} | ${results.summary.pending} | ${results.summary.other} | ${flakyCount} | ${durationFormatted} |`;
    });

    // Generate the summary table in raw format
    const summaryTable = `
| Build 🏗️ | Tests 📝 | Passed ✅ | Failed ❌ | Skipped ⏭️ | Pending ⏳ | Other ❓ | Flaky 🍂 | Duration ⏱️ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${summaryRows.join('\n')}
`;

    // If using core.summary, you can also add it to the GitHub Actions job summary
    core.summary.addRaw(summaryTable).write();
}
