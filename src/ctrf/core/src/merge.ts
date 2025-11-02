import fs from 'fs'
import path from 'path'

export async function mergeReports(
  directory: string,
  output: string,
  outputDir: string,
  keepReports: boolean
) {
  try {
    const directoryPath = path.resolve(directory)
    const outputFileName = output
    const resolvedOutputDir = outputDir
      ? path.resolve(outputDir)
      : directoryPath
    const outputPath = path.join(resolvedOutputDir, outputFileName)

    console.log('Merging CTRF reports...')

    const files = fs.readdirSync(directoryPath)

    files.forEach(file => {
      console.log('Found file:', file)
    })

    const ctrfReportFiles = files.filter(file => {
      try {
        if (path.extname(file) !== '.json') {
          console.log(`Skipping non-CTRF file: ${file}`)
          return false
        }
        const filePath = path.join(directoryPath, file)
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const jsonData = JSON.parse(fileContent)
        if (!('results' in jsonData)) {
          console.log(`Skipping non-CTRF file: ${file}`)
          return false
        }
        return true
      } catch (error) {
        console.error(`Error reading JSON file '${file}':`, error)
        return false
      }
    })

    if (ctrfReportFiles.length === 0) {
      console.log('No CTRF reports found in the specified directory.')
      return
    }

    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true })
      console.log(`Created output directory: ${resolvedOutputDir}`)
    }

    const mergedReport = ctrfReportFiles
      .map(file => {
        console.log('Merging report:', file)
        const filePath = path.join(directoryPath, file)
        const fileContent = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(fileContent)
      })
      .reduce(
        (acc, curr) => {
          if (!acc.results) {
            return curr
          }

          acc.results.summary.tests += curr.results.summary.tests
          acc.results.summary.passed += curr.results.summary.passed
          acc.results.summary.failed += curr.results.summary.failed
          acc.results.summary.skipped += curr.results.summary.skipped
          acc.results.summary.pending += curr.results.summary.pending
          acc.results.summary.other += curr.results.summary.other

          acc.results.tests.push(...curr.results.tests)

          acc.results.summary.start = Math.min(
            acc.results.summary.start,
            curr.results.summary.start
          )
          acc.results.summary.stop = Math.max(
            acc.results.summary.stop,
            curr.results.summary.stop
          )

          return acc
        },
        { results: null }
      )

    fs.writeFileSync(outputPath, JSON.stringify(mergedReport, null, 2))

    if (!keepReports) {
      ctrfReportFiles.forEach(file => {
        const filePath = path.join(directoryPath, file)
        if (file !== outputFileName) {
          fs.unlinkSync(filePath)
        }
      })
    }

    console.log('CTRF reports merged successfully.')
    console.log(`Merged report saved to: ${outputPath}`)
  } catch (error) {
    console.error('Error merging CTRF reports:', error)
  }
}
