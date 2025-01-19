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
  getEmojiHelper,
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
import { sliceArrayHelper } from './array'
import { addHelper } from './math'

export function registerAllHelpers(): void {
  getEmojiHelper()
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
  escapeMarkdownHelper()
  splitLinesHelper()
  sliceStringHelper()
  convertTimestamp()
  addHelper()
  anyFlakyTestsHelper()
  anyFailedTestsHelper()
  anySkippedTestsHelper()
}
