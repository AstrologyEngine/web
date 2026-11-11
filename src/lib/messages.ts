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

export const calculationMessages = {
  INVALID_INPUT: "error.calculation.invalidInput",
  DATA_UNAVAILABLE: "error.calculation.dataUnavailable",
  DATA_INTEGRITY: "error.calculation.dataIntegrity",
  OUT_OF_RANGE: "error.calculation.outOfRange",
  NO_VERIFIED_DATA: "error.calculation.noVerifiedData",
  CALCULATION_FAILED: "error.calculation.failed",
} as const satisfies Record<string, PlainKey>;
export type CalculationCode = keyof typeof calculationMessages;

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
export const calculationMessageKey = (code: unknown) =>
  lookup(calculationMessages, code, "CALCULATION_FAILED");
