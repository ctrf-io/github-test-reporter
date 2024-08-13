#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import https from 'https';
import * as core from '@actions/core';
import { CtrfReport } from '../types/ctrf';
import { write, generateSummaryDetailsTable, generateTestDetailsTable, generateFailedTestsDetailsTable, generateFlakyTestsDetailsTable, annotateFailed } from './summary';

interface Arguments {
    _: (string | number)[];
    file?: string;
    postComment?: boolean;
}

const argv: Arguments = yargs(hideBin(process.argv))
    .command(['$0 <file>', 'all <file>'], 'Generate all tables from the specified CTRF file', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string',
            demandOption: true
        });
    })
    .command('summary <file>', 'Generate test summary from a CTRF report', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
        });
    })
    .command('tests <file>', 'Generate test details from a CTRF report', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
        });
    })
    .command('failed <file>', 'Generate fail test report from a CTRF report', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
        });
    })
    .command('flaky <file>', 'Generate flaky test report from a CTRF report', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
        });
    })
    .command('annotate <file>', 'Annotate failed tests from a CTRF report', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
        });
    })
    .option('post-comment', {
        type: 'boolean',
        description: 'Post a comment on the PR with a link to the summary',
        default: false
    })
    .help()
    .alias('help', 'h')
    .parseSync();
// Extract the command used or default to an empty string if none provided
const commandUsed = argv._[0] || '';

// Check if the command is 'all' or no specific command was given
if ((commandUsed === 'all' || commandUsed === '') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            generateSummaryDetailsTable(report);
            generateTestDetailsTable(report.results.tests);
            generateFailedTestsDetailsTable(report.results.tests);
            generateFlakyTestsDetailsTable(report.results.tests);
            annotateFailed(report);
            write();
            if (argv.postComment) {
                postSummaryComment(report);
            }
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
} else if (argv._.includes('summary') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            generateSummaryDetailsTable(report);
            write();
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
} else if (argv._.includes('tests') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            generateTestDetailsTable(report.results.tests);
            write();
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
} else if (argv._.includes('failed') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            generateFailedTestsDetailsTable(report.results.tests);
            write();
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
} else if (argv._.includes('flaky') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            generateFlakyTestsDetailsTable(report.results.tests);
            write();
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
}
else if (argv._.includes('annotate') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            annotateFailed(report);
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
}
else {
}
function validateCtrfFile(filePath: string): CtrfReport | null {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData: CtrfReport = JSON.parse(fileContent);

        if (!jsonData.results || !jsonData.results.summary || !jsonData.results.tests) {
            console.warn('Warning: The file does not contain valid CTRF data.');
            core.setFailed('Invalid CTRF file format.');
            return null;
        }
        return jsonData;
    } catch (error) {
        console.error('Failed to read or process the file:', error);
        core.setFailed(`Error processing the file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
}

function postSummaryComment(report: CtrfReport) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('GITHUB_TOKEN is not set. This is required for post-comment argument');
        return;
    }

    const context = process.env.GITHUB_CONTEXT ? JSON.parse(process.env.GITHUB_CONTEXT) : null;
    if (!context) {
        console.error('GITHUB_CONTEXT is not set. This is required for post-comment argument');
        return;
    }

    const { owner, repo } = context.repo;
    const pull_number = context.issue.number;

    if (!pull_number) {
        console.log('Action is not running in a pull request context. Skipping comment.');
        return;
    }

    const summaryUrl = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}#summary`;
    const commentBody = `### Test Summary\nYou can view the detailed summary [here](${summaryUrl}).`;

    const data = JSON.stringify({
        body: commentBody,
    });

    const options = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/issues/${pull_number}/comments`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'github-actions-ctrf'
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Comment posted successfully.');
            } else {
                console.error(`Failed to post comment: ${res.statusCode} - ${responseBody}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`Failed to post comment: ${error.message}`);
    });

    req.write(data);
    req.end();
}

