import * as fs from 'fs'
import { CtrfReport } from 'src/types'

export function readTemplate(filePath: string): string {
  if (!filePath.endsWith('.hbs') && !filePath.endsWith('.md')) {
    return filePath
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filePath}`)
  }

  return fs.readFileSync(filePath, 'utf-8')
}

export function readCtrfReport(filePath: string): CtrfReport {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON file not found: ${filePath}`)
  }

  const fileContent: CtrfReport = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CtrfReport;

  if (!fileContent.results) {
    throw new Error(`CTRF report not found at: ${filePath}`)
  }

  return fileContent
}
