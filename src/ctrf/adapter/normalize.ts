import type { CTRFReport, Test, Environment } from 'ctrf'
import type {
  LegacyCTRFReport,
  LegacyEnvironment,
  LegacyTest
} from './legacy-types.js'

// ---------------------------------------------------------------------------
// Version utilities
// ---------------------------------------------------------------------------

/**
 * Parse a semver string ("major.minor.patch") into a numeric tuple.
 * Returns [0, 0, 0] for any string that cannot be parsed.
 */
export function parseSemVer(version: string): [number, number, number] {
  const parts = version.split('.').map(Number)
  const [major = 0, minor = 0, patch = 0] = parts
  if (parts.length !== 3 || parts.some(isNaN)) return [0, 0, 0]
  return [major, minor, patch]
}

/**
 * Return true if specVersion is absent or parses as a version below 1.0.0.
 * All current CTRF reporters emit "0.0.0"; once the spec reaches 1.0.0 the
 * normalizations in this file will no longer be needed.
 */
export function isPreV1(specVersion: string | undefined): boolean {
  if (!specVersion) return true
  const [major] = parseSemVer(specVersion)
  return major < 1
}

// ---------------------------------------------------------------------------
// Individual field normalizers (exported for fine-grained reuse)
// ---------------------------------------------------------------------------

/**
 * Normalize Test.suite from a legacy plain string to the canonical string[].
 */
export function normalizeTestSuite(test: LegacyTest): Test {
  return {
    ...test,
    suite: typeof test.suite === 'string' ? [test.suite] : test.suite
  }
}

/**
 * Normalize Environment.buildNumber from a legacy string to the canonical number.
 * Returns undefined if the string cannot be coerced to a finite integer.
 */
export function normalizeEnvironmentBuildNumber(
  env: LegacyEnvironment | undefined
): Environment | undefined {
  if (!env) return undefined
  const { buildNumber, ...rest } = env
  const normalized: number | undefined =
    typeof buildNumber === 'string'
      ? parseInt(buildNumber, 10) || undefined
      : buildNumber
  return { ...rest, buildNumber: normalized }
}

// ---------------------------------------------------------------------------
// Plugin interface — extensible normalization pipeline
// ---------------------------------------------------------------------------

/**
 * A NormalizerPlugin declares which spec versions it targets and how to
 * transform a LegacyCTRFReport before it is handed to the rest of the app.
 *
 * Add a new plugin to handle any field-level changes introduced in a future
 * CTRF spec version without modifying existing plugins.
 *
 * @example
 * // Handle a hypothetical v1.x field change:
 * const v1FieldPlugin: NormalizerPlugin = {
 *   appliesTo: (v) => { const [major] = parseSemVer(v ?? '0'); return major === 1 },
 *   normalize: (raw) => ({ ...raw, results: { ...raw.results, ... } })
 * }
 * export const customNormalize = createReportNormalizer([preV1Plugin, v1FieldPlugin])
 */
export interface NormalizerPlugin {
  /**
   * Called with the report's specVersion (may be undefined for very old reports).
   * Return true if this plugin should be applied.
   */
  appliesTo: (specVersion: string | undefined) => boolean
  /**
   * Transform the raw report. Receives and returns LegacyCTRFReport so plugins
   * can be composed in sequence before the final cast to CTRFReport.
   */
  normalize: (raw: LegacyCTRFReport) => LegacyCTRFReport
}

/**
 * Built-in plugin for pre-v1 CTRF reports.
 *
 * Handles:
 *  - Test.suite: string → string[]
 *  - Environment.buildNumber: string → number
 */
export const preV1Plugin: NormalizerPlugin = {
  appliesTo: specVersion => isPreV1(specVersion),
  normalize: raw => ({
    ...raw,
    results: {
      ...raw.results,
      tests: raw.results.tests.map(normalizeTestSuite),
      environment: normalizeEnvironmentBuildNumber(raw.results.environment)
    }
  })
}

// ---------------------------------------------------------------------------
// Normalizer factory
// ---------------------------------------------------------------------------

/**
 * Build a report normalizer from an ordered list of plugins.
 *
 * Plugins are applied in order; only those whose appliesTo() predicate returns
 * true for the given specVersion are executed.
 *
 * @example
 * const normalize = createReportNormalizer([preV1Plugin, myCustomPlugin])
 * const report: CTRFReport = normalize(rawParsed)
 */
export function createReportNormalizer(
  plugins: NormalizerPlugin[]
): (raw: LegacyCTRFReport) => CTRFReport {
  return (raw: LegacyCTRFReport): CTRFReport => {
    const specVersion = raw.specVersion
    const result = plugins
      .filter(p => p.appliesTo(specVersion))
      .reduce<LegacyCTRFReport>((acc, p) => p.normalize(acc), raw)
    return result as unknown as CTRFReport
  }
}

// ---------------------------------------------------------------------------
// Default normalizer — apply all built-in plugins
// ---------------------------------------------------------------------------

/**
 * Normalize a CTRF report read from disk or received over the network.
 *
 * Applies all built-in legacy normalizations based on the report's specVersion:
 *  - Pre-v1: normalizes Test.suite and Environment.buildNumber
 *
 * Reports at specVersion >= 1.0.0 are returned as-is.
 *
 * @example
 * const raw: LegacyCTRFReport = JSON.parse(content)
 * const report: CTRFReport = normalizeLegacyReport(raw)
 */
export const normalizeLegacyReport: (raw: LegacyCTRFReport) => CTRFReport =
  createReportNormalizer([preV1Plugin])
