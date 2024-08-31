// import https from 'https';
import { CtrfReport } from '../types/ctrf';
// import * as core from '@actions/core';
import fs from 'fs';


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

    const repo = context.repository.full_name;

    console.log('GitHub Event Contexts:', JSON.stringify(context, null, 2));

}