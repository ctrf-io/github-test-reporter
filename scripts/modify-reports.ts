import * as fs from 'fs';
import * as path from 'path';

interface Test {
    name: string;
    status: 'passed' | 'failed' | 'pending' | 'skipped' | 'other';
    duration: number;
    flaky?: boolean;
    retries?: number;
    message?: string;
    trace?: string;
    filePath?: string;
    suite?: string;
}

interface TestReport {
    results: {
        tool: {
            name: string;
        };
        summary: {
            tests: number;
            passed: number;
            failed: number;
            pending: number;
            skipped: number;
            other: number;
            start: number;
            stop: number;
        };
        tests: Test[];
    };
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function modifyTestResults(tests: Test[]): Test[] {
    return tests.map(test => {
        // Randomly make some tests flaky
        if (Math.random() < 0.3) {
            test.flaky = true;
            test.retries = getRandomInt(1, 3);
        }

        // Randomly change some test statuses
        const rand = Math.random();
        if (rand < 0.15) {
            test.status = 'failed';
            test.message = 'Assertion failed: expected value to be true';
            test.trace = `${test.filePath}:${getRandomInt(10, 100)}`;
        } else if (rand < 0.2) {
            test.status = 'skipped';
            delete test.message;
            delete test.trace;
        } else if (rand < 0.25) {
            test.status = 'pending';
            delete test.message;
            delete test.trace;
        } else {
            test.status = 'passed';
            delete test.message;
            delete test.trace;
        }

        // Randomize duration between 500ms and 3000ms
        test.duration = getRandomInt(500, 3000);

        return test;
    });
}

function updateSummary(tests: Test[]): any {
    const summary = {
        tests: tests.length,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        other: 0,
        start: Date.now() - 10000, // 10 seconds ago
        stop: Date.now()
    };

    tests.forEach(test => {
        switch (test.status) {
            case 'passed':
                summary.passed++;
                break;
            case 'failed':
                summary.failed++;
                break;
            case 'pending':
                summary.pending++;
                break;
            case 'skipped':
                summary.skipped++;
                break;
            default:
                summary.other++;
        }
    });

    return summary;
}

function modifyReport(reportPath: string): void {
    const report: TestReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    
    // Modify test results
    report.results.tests = modifyTestResults(report.results.tests);
    
    // Update summary
    report.results.summary = updateSummary(report.results.tests);

    // Write modified report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Modified report: ${reportPath}`);
}

// Process all JSON files in ctrf-reports directory
const reportsDir = path.join(process.cwd(), 'ctrf-reports');
const files = fs.readdirSync(reportsDir)
    .filter(file => file.endsWith('.json'));

files.forEach(file => {
    modifyReport(path.join(reportsDir, file));
}); 