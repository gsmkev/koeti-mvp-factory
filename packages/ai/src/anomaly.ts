// Statistical anomaly detection for the insights crons — deliberately no AI:
// deterministic, free, and explainable ("3.1× your average day").

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface Anomaly extends SeriesPoint {
  /** Signed z-score: positive = above the mean. */
  zScore: number;
  mean: number;
}

// ponytail: plain z-score over the whole series (the point tests against a mean
// that includes itself) — fine for daily crons; switch to rolling median/MAD if
// gradual trends start masking spikes.
export function detectAnomalies(
  points: SeriesPoint[],
  { threshold = 2.5, minPoints = 7 }: { threshold?: number; minPoints?: number } = {},
): Anomaly[] {
  if (points.length < minPoints) return []; // small samples scream on noise
  const values = points.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  if (std === 0) return [];
  return points
    .map((p) => ({ ...p, zScore: (p.value - mean) / std, mean }))
    .filter((p) => Math.abs(p.zScore) >= threshold);
}
