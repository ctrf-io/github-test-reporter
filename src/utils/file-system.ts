import * as fs from 'fs'
import { CtrfReport } from 'src/types'

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
 * Reads and parses a CTRF report JSON file from the specified file path.
 *
 * - Verifies the existence of the file.
 * - Parses the JSON content into a `CtrfReport` object.
 * - Ensures that the parsed file contains valid CTRF results data.
 *
 * @param filePath - The file path to the CTRF report JSON file.
 * @returns A `CtrfReport` object containing the parsed report data.
 * @throws An error if the file does not exist, is not valid JSON, or does not contain CTRF results.
 */
export function readCtrfReport(filePath: string): CtrfReport {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON file not found: ${filePath}`)
  }

  const fileContent: CtrfReport = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  ) as CtrfReport

  if (!fileContent.results) {
    throw new Error(`CTRF report not found at: ${filePath}`)
  }

  return fileContent
}
