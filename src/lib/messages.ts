/**
 * Server and worker outcomes are stable codes; the client words them with CMS
 * copy (docs/designs/cms.md §9.3).
 */
import type { PlainKey } from "./copy/copy";

export const resolverMessages = {
  RANGE: "error.resolver.range",
  EXPLICIT_TIMEZONE: "error.resolver.explicitTimezone",
  CHOOSE_DATE: "error.resolver.chooseDate",
  DATE_INCOMPLETE: "error.resolver.dateIncomplete",
  TIME_MISSING: "error.resolver.timeMissing",
  CHOOSE_PLACE: "error.resolver.choosePlace",
  PLACE_NOT_FOUND: "error.resolver.placeNotFound",
  TIME_SKIPPED: "error.resolver.timeSkipped",
  TIME_AMBIGUOUS: "error.resolver.timeAmbiguous",
  TIME_IN_FUTURE: "error.resolver.timeInFuture",
  OUT_OF_COVERAGE: "error.resolver.outOfCoverage",
  INVALID_BIRTH: "error.resolver.invalidBirth",
  EMPTY_INPUT: "error.resolver.emptyInput",
  INPUT_TOO_LONG: "error.resolver.inputTooLong",
  INVALID_INPUT: "error.resolver.invalidInput",
  TEMPORARY_FAILURE: "error.resolver.temporaryFailure",
} as const satisfies Record<string, PlainKey>;
export type ResolverCode = keyof typeof resolverMessages;

/**
 * Calculation outcomes: worker codes plus the page's own TIMEOUT and
 * NOT_STARTED. Shown as one "Whoops, …" line; only some are worth retrying.
 */
export const calculationMessages = {
  INVALID_INPUT: "error.chart.invalidInput",
  DATA_UNAVAILABLE: "error.chart.dataUnavailable",
  DATA_INTEGRITY: "error.chart.dataIntegrity",
  OUT_OF_RANGE: "error.chart.outOfRange",
  NO_VERIFIED_DATA: "error.chart.noVerifiedData",
  CALCULATION_FAILED: "error.chart.failed",
  TIMEOUT: "error.chart.timeout",
  NOT_STARTED: "error.chart.notStarted",
} as const satisfies Record<string, PlainKey>;
export type CalculationCode = keyof typeof calculationMessages;
/** Retrying cannot help these: the birth details have to change. */
const permanent = new Set<CalculationCode>([
  "INVALID_INPUT",
  "OUT_OF_RANGE",
  "NO_VERIFIED_DATA",
]);
export const calculationRetryable = (code: CalculationCode) =>
  !permanent.has(code);
export const calculationCode = (code: unknown): CalculationCode =>
  typeof code === "string" && Object.hasOwn(calculationMessages, code)
    ? (code as CalculationCode)
    : "CALCULATION_FAILED";

const lookup = <T extends Record<string, PlainKey>>(
  table: T,
  code: unknown,
  fallback: keyof T,
): PlainKey =>
  typeof code === "string" && Object.hasOwn(table, code)
    ? table[code as keyof T]!
    : table[fallback]!;

export const resolverMessageKey = (code: unknown) =>
  lookup(resolverMessages, code, "TEMPORARY_FAILURE");
