import fs from 'fs'
import path from 'path'
import { Report } from '../../types/ctrf.js'
import { glob } from 'glob'

/**
 * Reads a single CTRF report file from a specified path.
 *
 * @param filePath Path to the JSON file containing the CTRF report.
 * @returns The parsed `CtrfReport` object.
 * @throws If the file does not exist, is not a valid JSON, or does not conform to the `CtrfReport` structure.
 */
export function readReportFromFile(filePath: string): Report {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON file not found: ${filePath}`)
  }
  const resolvedPath = path.resolve(filePath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`The file '${resolvedPath}' does not exist.`)
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf8')

    const parsed = JSON.parse(content)

    if (!isCtrfReport(parsed)) {
      throw new Error(`The file '${resolvedPath}' is not a valid CTRF report.`)
    }

    return parsed as Report
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error'
    throw new Error(
      `Failed to read or parse the file '${resolvedPath}': ${errorMessage}`
    )
  }
}

/**
 * Reads all CTRF report files from a given directory.
 *
 * @param directoryPath Path to the directory containing JSON files.
 * @returns An array of parsed `CtrfReport` objects.
 * @throws If the directory does not exist or no valid CTRF reports are found.
 */
export function readReportsFromDirectory(directoryPath: string): Report[] {
  directoryPath = path.resolve(directoryPath)

  if (!fs.existsSync(directoryPath)) {
    throw new Error(`The directory '${directoryPath}' does not exist.`)
  }

  const files = fs.readdirSync(directoryPath)

  const reports: Report[] = files
    .filter(file => path.extname(file) === '.json')
    .map(file => {
      const filePath = path.join(directoryPath, file)
      try {
        const content = fs.readFileSync(filePath, 'utf8')
        const parsed = JSON.parse(content)

        if (!isCtrfReport(parsed)) {
          console.warn(`Skipping invalid CTRF report file: ${file}`)
          return null
        }

        return parsed as Report
      } catch (error) {
        console.warn(`Failed to read or parse file '${file}':`, error)
        return null
      }
    })
    .filter((report): report is Report => report !== null)

  if (reports.length === 0) {
    throw new Error(
      `No valid CTRF reports found in the directory '${directoryPath}'.`
    )
  }

  return reports
}

/**
 * Reads all CTRF report files matching a glob pattern.
 *
 * @param pattern The glob pattern to match files (e.g., ctrf/*.json).
 * @returns An array of parsed `CtrfReport` objects.
 * @throws If no valid CTRF reports are found.
 */

export function readReportsFromGlobPattern(pattern: string): Report[] {
  const files = glob.sync(pattern)

  if (files.length === 0) {
    throw new Error(`No files found matching the pattern '${pattern}'.`)
  }

  const reports: Report[] = files
    .map(file => {
      try {
        const content = fs.readFileSync(file, 'utf8')
        const parsed = JSON.parse(content)

        if (!isCtrfReport(parsed)) {
          console.warn(`Skipping invalid CTRF report file: ${file}`)
          return null
        }

        return parsed as Report
      } catch (error) {
        console.warn(`Failed to read or parse file '${file}':`, error)
        return null
      }
    })
    .filter((report): report is Report => report !== null)

  if (reports.length === 0) {
    throw new Error(
      `No valid CTRF reports found matching the pattern '${pattern}'.`
    )
  }

  return reports
}

/**
 * Checks if an object conforms to the `CtrfReport` structure.
 *
 * @param obj The object to validate.
 * @returns `true` if the object matches the `CtrfReport` type; otherwise, `false`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCtrfReport(obj: any): obj is Report {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.results &&
    Array.isArray(obj.results.tests) &&
    typeof obj.results.summary === 'object' &&
    typeof obj.results.tool === 'object'
  )
}
