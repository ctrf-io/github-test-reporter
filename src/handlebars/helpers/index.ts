import {
  convertTimestamp,
  escapeMarkdownHelper,
  sliceStringHelper,
  splitLinesHelper,
  uppercaseHelper
} from './string'
import {
  anyFailedTestsHelper,
  anyFlakyTestsHelper,
  anySkippedTestsHelper,
  countFlakyHelper,
  equalsHelper,
  formatDurationMsToHumanHelper,
  formatDurationStartStopToHumanHelper,
  formatRateHelper,
  formatTestPathHelper,
  getCollapseLargeReportsHelper,
  getEmojiHelper,
  getGitHubIconHelper,
  LimitFailedTests,
  moreThanHelper,
  sortTestsByFailRateHelper,
  sortTestsByFlakyRateHelper
} from './ctrf'
import {
  ansiToHtmlHelper,
  formatMessageHelper,
  formatMessagePreCodeHelper,
  stripAnsiHelper
} from './ansi'
import { reverseArray, sliceArrayHelper } from './array'
import { addHelper } from './math'

export function registerAllHelpers(): void {
  getEmojiHelper()
  getGitHubIconHelper()
  formatDurationStartStopToHumanHelper()
  countFlakyHelper()
  stripAnsiHelper()
  ansiToHtmlHelper()
  uppercaseHelper()
  equalsHelper()
  formatDurationMsToHumanHelper()
  formatMessageHelper()
  formatMessagePreCodeHelper()
  LimitFailedTests()
  moreThanHelper()
  sortTestsByFlakyRateHelper()
  formatRateHelper()
  sortTestsByFailRateHelper()
  sliceArrayHelper()
  reverseArray()
  escapeMarkdownHelper()
  splitLinesHelper()
  sliceStringHelper()
  convertTimestamp()
  addHelper()
  anyFlakyTestsHelper()
  anyFailedTestsHelper()
  anySkippedTestsHelper()
  formatTestPathHelper()
  getCollapseLargeReportsHelper()
}
