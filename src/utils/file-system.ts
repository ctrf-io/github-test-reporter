import * as fs from 'fs'
import { CtrfReport } from 'src/types'
import { mergeReports, readReportsFromGlobPattern } from 'ctrf'

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
  const reports: CtrfReport[] = readReportsFromGlobPattern(
    pattern
  ) as CtrfReport[]

  if (reports.length === 0) {
    throw new Error(`CTRF report not found at: ${pattern}`)
  }

  const report: CtrfReport =
    reports.length > 1 ? (mergeReports(reports) as CtrfReport) : reports[0]
  return report
}
