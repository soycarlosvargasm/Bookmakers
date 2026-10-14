import type { NormalizedRecord } from "../normalization/types.js";
import type { QualityFinding } from "../quality/service.js";

export type ReviewCaseType = "ambiguous_match" | "near_match" | "unmatched_cross_source_event" | "conflicting_match" | "deterministic_anomaly" | "correction_confirmed";
export type ReviewCaseStatus = "OPEN" | "CONFIRMED_MATCH" | "CONFIRMED_NON_MATCH" | "DISMISSED" | "CORRECTED";
export type ExperimentalReviewCase = { caseType: ReviewCaseType; source: string; leftRecord?: NormalizedRecord; rightRecord?: NormalizedRecord; evidence: Record<string, unknown>; datasetVersion: string };
export type ReviewRevision = { caseId: number; status: ReviewCaseStatus; groundTruthLabel?: boolean | null; correction?: Record<string, unknown> | null; reviewer?: string | null; reason?: string | null };

export const deterministicReviewCases = (source: string, records: NormalizedRecord[], findings: QualityFinding[], datasetVersion = "review-v1"): ExperimentalReviewCase[] => {
  const cases: ExperimentalReviewCase[] = findings.map((finding) => ({ caseType: "deterministic_anomaly", source, evidence: { code: finding.code, count: finding.count, details: finding.details, labelsMustBeHumanConfirmed: true }, datasetVersion }));
  return [...cases, ...records.filter((record) => !record.sourceEventId || !record.market || !record.selection).map((record) => ({ caseType: "deterministic_anomaly" as const, source, leftRecord: record, evidence: { code: "SCHEMA_DRIFT", labelsMustBeHumanConfirmed: true }, datasetVersion }))];
};
