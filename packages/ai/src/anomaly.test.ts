import { describe, expect, it } from 'vitest';
import { detectAnomalies } from './anomaly';

const day = (label: string, value: number) => ({ label, value });

describe('detectAnomalies', () => {
  it('flags a spike well above the mean', () => {
    const series = [10, 12, 11, 9, 10, 11, 10, 100].map((v, i) => day(`d${i}`, v));
    const anomalies = detectAnomalies(series);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].label).toBe('d7');
    expect(anomalies[0].zScore).toBeGreaterThan(2.5);
  });

  it('returns nothing for a flat series', () => {
    const series = Array.from({ length: 10 }, (_, i) => day(`d${i}`, 5));
    expect(detectAnomalies(series)).toEqual([]);
  });

  it('stays quiet below minPoints', () => {
    expect(detectAnomalies([day('a', 1), day('b', 1000)])).toEqual([]);
  });

  it('respects a custom threshold', () => {
    const series = [10, 12, 11, 9, 10, 11, 10, 20].map((v, i) => day(`d${i}`, v));
    expect(detectAnomalies(series, { threshold: 1.5 }).length).toBeGreaterThan(0);
    expect(detectAnomalies(series, { threshold: 10 })).toEqual([]);
  });
});
