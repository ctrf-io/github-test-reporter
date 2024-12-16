import { exitActionOnFail, getAllGitHubContext, handleError } from '../github'
import { getInputs } from './inputs'
import { prepareReport } from '../ctrf'
import { handleViewsAndComments, handleAnnotations } from '../github/handler'

export async function runAction(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getAllGitHubContext()

    const report = await prepareReport(inputs, githubContext)

    await handleViewsAndComments(inputs, report)
    handleAnnotations(inputs, report)

    if (inputs.exitOnFail) {
      exitActionOnFail(report)
    }
  } catch (error) {
    handleError(error)
  }
}
