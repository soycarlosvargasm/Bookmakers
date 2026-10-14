import type { NormalizedRecord } from "../normalization/types.js";

export const MATCH_FEATURE_NAMES = [
  "sport_exact", "competition_similarity", "event_name_similarity", "home_similarity", "away_similarity",
  "reversed_participants_similarity", "participants_similarity", "start_time_proximity", "market_similarity",
  "period_similarity", "player_similarity", "selection_similarity", "line_similarity", "source_ids_present"
] as const;
export type MatchFeatureName = (typeof MATCH_FEATURE_NAMES)[number];
export type MatchFeatures = Record<MatchFeatureName, number>;
export type MatchDatasetRow = { pairKey: string; leftEventKey: string; rightEventKey: string; observedAt: string; left: NormalizedRecord; right: NormalizedRecord };
export type MatchAssist = { pairKey: string; decision: "deterministic_exact" | "ml_match" | "abstain"; confidence: number; reasons: string[]; features: MatchFeatures; modelVersion: string | null };
export type BinaryMetrics = { precision: number; recall: number; f1: number; falsePositiveRate: number; falseNegativeRate: number; confusionMatrix: { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number }; evaluated: number; abstained?: number };
export type LogisticModelArtifact = { kind: "logistic_regression"; featureVersion: string; weights: Record<MatchFeatureName, number>; bias: number; threshold: number; abstainBelow: number };
export type AnomalyFeatureName = "invalid_odds" | "odds_log" | "line_abs" | "event_time_gap" | "provider_time_gap" | "price_move" | "duplicate_rate" | "source_disagreement" | "schema_missing";
export const ANOMALY_FEATURE_NAMES: readonly AnomalyFeatureName[] = ["invalid_odds", "odds_log", "line_abs", "event_time_gap", "provider_time_gap", "price_move", "duplicate_rate", "source_disagreement", "schema_missing"];
export type AnomalyFeatures = Record<AnomalyFeatureName, number>;
export type AnomalyModelArtifact = { kind: "robust_mad"; featureVersion: string; medians: Record<AnomalyFeatureName, number>; mads: Record<AnomalyFeatureName, number>; threshold: number };
export type AnomalyFinding = { entityKey: string; observationAt: string; anomalyType: string; score: number; decision: "review" | "normal"; reasons: string[]; features: AnomalyFeatures; modelVersion: string | null };
export type AnomalyDatasetRow = { observationId: number; observedAt: string; record: NormalizedRecord; previousOdds: number | null; duplicateRate: number; sourceDisagreement: number; knownAnomaly: boolean };
export type MlTrainingReport = { datasetVersion: string; featureVersion: string; modelVersion: string; trainingDate: string; datasetSize: number; trainCount: number; validationCount: number; testCount: number; matchingMetrics: BinaryMetrics; deterministicBaseline: BinaryMetrics; matchingIntegration: "enabled" | "abstain_baseline_better"; anomalyDatasetSize: number; anomalyMetrics: BinaryMetrics | null; status: "READY" | "ABSTAIN" };
