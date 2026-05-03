import type { CTRFReport, Test, Environment } from 'ctrf'

/**
 * Test shape as emitted by pre-v1 reporters.
 *
 * Differences from canonical Test:
 *  - suite: may be a plain string instead of string[]
 */
export type LegacyTest = Omit<Test, 'suite'> & {
  suite?: string | string[]
}

/**
 * Environment shape as emitted by pre-v1 reporters.
 *
 * Differences from canonical Environment:
 *  - buildNumber: may be a string (CI systems often inject it as a string)
 */
export type LegacyEnvironment = Omit<Environment, 'buildNumber'> & {
  buildNumber?: string | number
}

/**
 * Root report shape at parse boundaries (disk, network, CI artifact).
 *
 * Use this type when reading untrusted/unversioned CTRF JSON.
 * Pass through normalizeLegacyReport() to obtain a canonical CTRFReport.
 */
export type LegacyCTRFReport = Omit<CTRFReport, 'results'> & {
  results: Omit<CTRFReport['results'], 'tests' | 'environment'> & {
    tests: LegacyTest[]
    environment?: LegacyEnvironment
  }
}
