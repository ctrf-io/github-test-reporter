import * as core from '@actions/core';
import {
    CtrfTest,
    CtrfTestState,
    CtrfReport
} from '../types/ctrf'


export function generateTestDetailsTable(tests: CtrfTest[]): void {
    try {
        core.summary.addHeading('Detailed Test Results', 3);

        const headers = [
            { data: 'Name', header: true },
            { data: 'Status', header: true },
            { data: 'Duration (ms)', header: true },
            { data: 'Flake 🍂', header: true }
        ];

        const rows = tests.map(test => [
            { data: test.name, header: false },
            { data: `${test.status} ${getEmojiForStatus(test.status)}`, header: false },
            { data: test.duration.toString(), header: false },
            { data: test.flake ? 'Yes' : '', header: false }
        ]);

        core.summary.addTable([headers, ...rows])
            .addLink('A ctrf plugin', 'https://ctrf.io')

        core.summary.write();

    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to append to job summary: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}

export function generateFlakyTestsDetailsTable(tests: CtrfTest[]): void {
    try {
        core.summary.addHeading('Flaky Test Details', 3);

        const flakyTests = tests.filter(test => test.flake);

        if (flakyTests.length > 0) {
            const headers = [
                { data: 'Name', header: true },
                { data: 'Status', header: true },
                { data: 'Retries', header: true },
                { data: 'Flake Status 🍂', header: true }
            ];

            const rows = flakyTests.map(test => [
                { data: test.name, header: false },
                { data: test.status + ' ' + getEmojiForStatus(test.status), header: false },
                { data: test.retry?.toString() || '0', header: false },
                { data: 'Yes', header: false }
            ]);

            core.summary.addTable([headers, ...rows])
                .addLink('A ctrf plugin', 'https://ctrf.io');
        } else {
            core.summary.addRaw('No flaky tests detected. ✨');
        }

        core.summary.write();
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to display failed test details: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}


export function generateFailedTestsDetailsTable(tests: CtrfTest[]) {
    try {
        const failedTests = tests.filter(test => test.status === 'failed');

        if (failedTests.length > 0) {
            core.summary.addHeading('Failed Test Details', 3);

            core.summary.addTable([
                [{ data: 'Name', header: true }, { data: 'Status', header: true }, { data: 'Failure Message', header: true }],
                ...failedTests.map(test => [
                    { data: test.name, header: false },
                    { data: `${test.status} ❌`, header: false },
                    { data: `${test.message}`, header: false }
                ])
            ])
                .addLink('A ctrf plugin', 'https://ctrf.io')

            core.summary.write();
        } else {
            core.summary.addRaw('No failed tests.').write();
        }
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to display failed test details: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}

export function generateSummaryDetailsTable(report: CtrfReport): void {
    try {
        const durationSeconds = report.results.summary.stop - report.results.summary.start;
        const durationFormatted = new Date(durationSeconds * 1000).toISOString().substr(11, 8); // Convert seconds to HH:MM:SS format

        const flakyCount = report.results.tests.filter(test => test.flake).length;

        core.summary
            .addHeading('Test Summary', 1)
            .addTable([
                [
                    'Tests 📝', 'Passed ✅', 'Failed ❌',
                    'Skipped ⏭️', 'Pending ⏳', 'Other ❓', 'Flake 🍂', 'Duration ⏱️'
                ],
                [
                    report.results.summary.tests.toString(),
                    report.results.summary.passed.toString(),
                    report.results.summary.failed.toString(),
                    report.results.summary.skipped.toString(),
                    report.results.summary.pending.toString(),
                    report.results.summary.other.toString(),
                    flakyCount.toString(),
                    durationFormatted,
                ]
            ])
            .addLink('A ctrf plugin', 'https://ctrf.io')
        core.summary.write();
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to append to job summary: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}

export function annotateFailed(report: CtrfReport): void {
    try {
        report.results.tests.forEach(test => {
            if (test.status === 'failed') {
                const message = test.message ? test.message : 'No message provided';
                const trace = test.trace ? test.trace : 'No trace available';
                const annotation = `${test.name}: ${message} - ${trace}`;

                core.error(annotation, {
                    title: `Failed Test: ${test.name}`,
                    file: test.filePath,
                    startLine: 0,
                    endLine: 0
                });
            }
        });
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to annotate failed tests: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}

function getEmojiForStatus(status: CtrfTestState): string {
    switch (status) {
        case 'passed':
            return '✅';
        case 'failed':
            return '❌';
        case 'skipped':
            return '⏭️';
        case 'pending':
            return '⏳';
        default:
            return '❓';
    }
}