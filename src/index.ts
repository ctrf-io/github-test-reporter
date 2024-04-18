#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import * as core from '@actions/core';
import { CtrfReport } from '../types/ctrf';
import { clearSummary, generateSummaryDetailsTable } from './summary';

interface Arguments {
    _: (string | number)[];
    file?: string;
}

const argv: Arguments = yargs(hideBin(process.argv))
    .command('summary <file>', 'Generate test summary from a specified file', (yargs) => {
        return yargs.positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
        });
    })
    .help()
    .alias('help', 'h')
    .parseSync();

if (argv._.includes('summary') && argv.file) {
    try {
        const data = fs.readFileSync(argv.file, 'utf8');
        console.log(`Generating summary for ${argv.file}`);
        console.log('File content:', data);
        const report = validateCtrfFile(argv.file)
        if (report !== null) {
            clearSummary()
            generateSummaryDetailsTable(report.results.summary);
        }
    } catch (error) {
        console.error('Failed to read file:', error);
    }
} else {
    console.log('Invalid command or file not specified.');
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

