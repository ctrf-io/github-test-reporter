import * as fs from 'fs'
import { CtrfReport } from 'src/types'
import { mergeReports, readReportsFromGlobPattern, Report } from 'ctrf'
import path from 'path'
import * as core from '@actions/core'
/**
 * Reads a Handlebars (`.hbs`) or Markdown (`.md`) template file from the specified file path.
 * If the file path does not point to a `.hbs` or `.md` file, the raw path is returned.
 *
 * @param filePath - The file path to the template file.
 * @returns The content of the template file as a string, or the raw file path if not `.hbs` or `.md`.
 * @throws An error if the file does not exist.
 */
export function readTemplate(filePath: string): string {
  if (!filePath.endsWith('.hbs') && !filePath.endsWith('.md')) {
    return filePath
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filePath}`)
  }

  return fs.readFileSync(filePath, 'utf-8')
}

/**
 * Reads, parses and merges report files from the specified glob pattern.
 *
 * - Verifies the existence of the file.
 * - Parses the JSON content into a `CtrfReport` object.
 * - Ensures that the parsed file contains valid CTRF results data.
 *
 * @param filePath - The file path to the CTRF report JSON file.
 * @returns A `CtrfReport` object containing the parsed report data.
 * @throws An error if the file does not exist, is not valid JSON, or does not contain CTRF results.
 */
export function readCtrfReports(pattern: string): CtrfReport {
  core.info(`Reading CTRF reports from ${pattern}`)
  try {
    const reports: CtrfReport[] = readReportsFromGlobPattern(
      pattern
    ) as CtrfReport[]

    if (reports.length === 0) {
      core.warning(`CTRF report not found at: ${pattern}. Exiting action.`)
      process.exit(0)
    }

    const report: CtrfReport =
      reports.length > 1
        ? (mergeReports(reports as Report[]) as CtrfReport)
        : reports[0]
    core.info(`Read ${reports.length} CTRF reports`)
    return report
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.warning(`${errorMessage}. Exiting action.`)
    process.exit(0)
  }
}

/**
 * Writes a CTRF report to the specified file path.
 *
 * @param filePath - The path where the report will be written.
 * @param report - The content of the report to write.
 */
export function writeReportToFile(filePath: string, report: CtrfReport): void {
  try {
    const fileName = path.basename(filePath)
    const isValidFileName = fileName && fileName.endsWith('.json')

    if (!isValidFileName) {
      console.warn(
        `Invalid write file path provided: "${filePath}". Ensure the path includes a valid JSON file name (e.g., "ctrf-report.json"). Skipping writing the processed report.`
      )
      return
    }

    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8')

    console.log(`CTRF successfully written to ${filePath}`)
  } catch (error) {
    console.error(`Failed to write the report to file: ${String(error)}`)
    throw error
  }
}
