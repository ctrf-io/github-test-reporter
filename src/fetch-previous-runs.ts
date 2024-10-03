import https from 'https'
import AdmZip from 'adm-zip'
import { CtrfReport } from '../types/ctrf'

export async function fetchPreviousRuns(
    githubProperties: any,
    rows: number = 10,
    maxRunsToCheck: number = 300
) {
    let apiUrl = `${githubProperties.apiUrl}/repos/${githubProperties.repoName}/actions/runs?per_page=100`
    let filteredRuns: any[] = []
    let totalRunsChecked = 0
    let page = 1
    let hasNextPage = true

    console.log(
        `Starting to fetch workflow runs for workflow: ${githubProperties.workflowName}`
    )

    while (
        hasNextPage &&
        filteredRuns.length < rows &&
        totalRunsChecked < maxRunsToCheck
    ) {
        const paginatedApiUrl = `${apiUrl}&page=${page}`
        console.log(`Fetching page ${page} of workflow runs...`)

        const response = await makeHttpsRequest(paginatedApiUrl, 'GET', null)

        if (response && response.body.workflow_runs) {
            totalRunsChecked += response.body.workflow_runs.length
            console.log(`Checked ${totalRunsChecked} total runs so far.`)

            const filteredPageRuns = response.body.workflow_runs.filter(
                (run: any) => {
                    const isBranchMatch =
                        run.head_branch === githubProperties.branchName &&
                        (run.event === 'push' || run.event === 'schedule')
                    const isPRMatch =
                        run.event === 'pull_request' &&
                        run.pull_requests.some(
                            (pr: any) => pr.number === githubProperties.pullRequestNumber
                        )
                    const isWorkflowNameMatch = run.name === githubProperties.workflowName;

                    if ((isBranchMatch || isPRMatch) && isWorkflowNameMatch) {
                        console.log(
                            `Match found for workflow ${run.name} with run number ${run.run_number}`
                        )
                    } else {
                        console.log(
                            `Match not found for workflow ${run.name} with run number ${run.run_number}`
                        )
                    }

                    return (isBranchMatch || isPRMatch) && isWorkflowNameMatch;
                }
            )

            if (filteredPageRuns.length > 0) {
                console.log(`Found ${filteredPageRuns.length} matches on page ${page}`)
            } else {
                console.log(`No matches found on page ${page}`)
            }

            filteredRuns = filteredRuns.concat(filteredPageRuns)
        }

        if (totalRunsChecked >= maxRunsToCheck) {
            console.log(
                `Hard limit of ${maxRunsToCheck} workflow runs reached. Stopping pagination.`
            )
            break
        }

        const linkHeader = response.headers && response.headers['link']
        if (linkHeader && linkHeader.includes('rel="next"')) {
            page++
        } else {
            hasNextPage = false
            console.log('No more pages to fetch.')
        }
    }

    if (filteredRuns.length >= rows) {
        console.log(`Rows limit of ${rows} matches reached. Returning results.`)
    }

    const finalResults = filteredRuns.slice(0, rows)
    console.log(
        `Returning ${finalResults.length} matches out of a possible ${rows}.`
    )
    return finalResults
}

export async function fetchArtifactInformation(artifactUrl: string) {
    return await makeHttpsRequest(artifactUrl, 'GET', null)
}

function unzipArtifact(artifactBuffer: Buffer): CtrfReport | null {
    const zip = new AdmZip(artifactBuffer)
    const zipEntries = zip.getEntries()
    let report: CtrfReport | null = null

    for (const zipEntry of zipEntries) {
        if (zipEntry.entryName.endsWith('.json')) {
            const jsonData = zipEntry.getData().toString('utf8')
            report = JSON.parse(jsonData)
            break
        }
    }

    return report
}

export async function fetchArtifactsFromPreviousBuilds(
    githubProperties: any,
    artifactName: string,
    rows: number
): Promise<
    Array<CtrfReport & { runId: string; runNumber: string; buildUrl: string }>
> {
    const previousRuns = await fetchPreviousRuns(githubProperties, rows)

    const reports: Array<
        CtrfReport & {
            runId: string
            runNumber: string
            buildUrl: string
        }
    > = []

    for (const run of previousRuns) {
        const artifactsData = await fetchArtifactInformation(run.artifacts_url)

        let artifactFound = false

        for (const artifact of artifactsData.body.artifacts) {
            if (artifact.name === artifactName) {
                console.log(
                    `Artifact found with name: ${artifactName} for workflow ${run.name} and run number ${run.run_number}`
                )
                artifactFound = true

                const artifactBuffer = await fetchArtifactRedirect(
                    artifact.archive_download_url
                )
                const report = unzipArtifact(artifactBuffer)

                if (report) {
                    const extendedReport = report as CtrfReport & {
                        runId: string
                        runNumber: string
                        buildUrl: string
                    }
                    extendedReport.runId = run.id
                    extendedReport.runNumber = run.run_number
                    extendedReport.buildUrl = run.html_url
                    reports.push(extendedReport)
                }
            }
        }

        if (!artifactFound) {
            console.log(
                `Artifact with name: ${artifactName} not found for workflow ${run.name} and run number ${run.run_number}`
            )
        }
    }
    return reports
}

export async function fetchArtifactRedirect(url: string): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
        const token = process.env.GITHUB_TOKEN
        const options = {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'github-actions-test-reporter-ctrf',
            },
        }

        https
            .get(url, options, (res) => {
                if (
                    res.statusCode &&
                    res.statusCode >= 300 &&
                    res.statusCode < 400 &&
                    res.headers.location
                ) {
                    const redirectUrl = res.headers.location
                    resolve(downloadArtifact(redirectUrl))
                } else if (
                    res.statusCode &&
                    res.statusCode >= 200 &&
                    res.statusCode < 300
                ) {
                    const data: Buffer[] = []
                    res.on('data', (chunk) => {
                        data.push(chunk)
                    })
                    res.on('end', () => {
                        resolve(Buffer.concat(data))
                    })
                } else {
                    reject(new Error(`Failed with status code ${res.statusCode}`))
                }
            })
            .on('error', reject)
    })
}

export async function downloadArtifact(url: string): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode === 200) {
                    const data: Buffer[] = []
                    res.on('data', (chunk) => {
                        data.push(chunk)
                    })
                    res.on('end', () => {
                        resolve(Buffer.concat(data))
                    })
                } else {
                    let errorData = ''
                    res.on('data', (chunk) => {
                        errorData += chunk
                    })
                    res.on('end', () => {
                        console.error(`Error downloading artifact: ${errorData}`)
                        reject(
                            new Error(
                                `Failed to download artifact with status code ${res.statusCode}`
                            )
                        )
                    })
                }
            })
            .on('error', reject)
    })
}

export async function makeHttpsRequest(
    url: string,
    method: 'GET' | 'POST' = 'GET',
    data: any = null
): Promise<any> {
    const token = process.env.GITHUB_TOKEN
    return await new Promise((resolve, reject) => {
        const options = {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'github-actions-test-reporter-ctrf',
            },
        }

        const req = https.request(url, options, (res) => {
            let responseData = ''

            const headers = res.headers

            res.on('data', (chunk) => {
                responseData += chunk
            })

            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
                    try {
                        const parsedData = JSON.parse(responseData)
                        resolve({ body: parsedData, headers })
                    } catch (error) {
                        reject(new Error('Failed to parse response body as JSON'))
                    }
                } else {
                    reject(
                        new Error(
                            `Request failed with status code ${res.statusCode}: ${responseData}`
                        )
                    )
                }
            })
        })

        req.on('error', (error) => {
            reject(error)
        })

        if (data) {
            req.write(JSON.stringify(data))
        }

        req.end()
    })
}
