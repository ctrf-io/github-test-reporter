#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import * as core from '@actions/core';
import { CtrfReport } from '../types/ctrf';
import { write, generateSummaryDetailsTable, generateTestDetailsTable, generateFailedTestsDetailsTable, generateFlakyTestsDetailsTable, annotateFailed } from './summary';
import { Octokit } from '@octokit/rest';

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
        console.error('GITHUB_TOKEN is not set.');
        return;
    }

    const octokit = new Octokit({ auth: token });

    const context = process.env.GITHUB_CONTEXT ? JSON.parse(process.env.GITHUB_CONTEXT) : null;
    if (!context) {
        console.error('GITHUB_CONTEXT is not set.');
        return;
    }

    const { owner, repo } = context.repo;
    const pull_number = context.issue.number;

    if (!pull_number) {
        console.log('Not running in a pull request context. Skipping comment.');
        return;
    }

    const summaryUrl = `https://github.com/${owner}/${repo}/actions/runs/${context.runId}#summary`;
    const commentBody = `### Test Summary\nYou can view the detailed summary [here](${summaryUrl}).`;

    octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: commentBody
    })
    .then(() => {
        console.log('Comment posted successfully.');
    })
    .catch(error => {
        core.setFailed(`Failed to post comment: ${error.message}`);
    });
}