import { Inputs } from '../../src/types'

/**
 * Determines if the tests in the CTRF report should be grouped based on the inputs.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if tests should be grouped, otherwise `false`.
 */
export function shouldGroupTests(inputs: Inputs): boolean {
  return (
    inputs.alwaysGroupBy || inputs.suiteFoldedReport || inputs.suiteListReport
  )
}
