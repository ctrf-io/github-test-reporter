import * as core from '@actions/core';
import {
    type Summary,
} from '../types/ctrf'

export function generateSummaryDetailsTable(summary: Summary): void {
    try {
        const durationSeconds = summary.stop - summary.start;
        const durationFormatted = new Date(durationSeconds * 1000).toISOString().substr(11, 8);

        core.summary
            .addHeading('Test Summary', 2)
            .addTable([
                [{ data: 'Metric', header: true }, { data: 'Value', header: true }],
                ['📝 Total Tests', summary.tests.toString()],
                ['✅ Passed', `${summary.passed.toString()}`],
                ['❌ Failed', `${summary.failed.toString()}`],
                ['⏭️ Skipped', `${summary.skipped.toString()}`],
                ['⏳ Pending', `${summary.pending.toString()}`],
                ['❓ Other', `${summary.other.toString()}`],
                ['⏱️ Duration', `${durationFormatted}`]
            ]).addLink(
                'A ctrf plugin',
                'https://ctrf.io',
            ).write()
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to append to job summary: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}


export function clearSummary() {
    try {
        
        core.summary.clear()
        core.summary.emptyBuffer()
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to display failed test details: ${error.message}`);
        } else {
            core.setFailed("An unknown error occurred");
        }
    }
}