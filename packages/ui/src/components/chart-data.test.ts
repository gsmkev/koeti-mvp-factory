// Tests for chart data.
import { describe, expect, it } from 'vitest';

import { countBy, groupSum, topN } from './chart-data';

const rows = [
  { cat: 'a', amt: 10 },
  { cat: 'b', amt: 5 },
  { cat: 'a', amt: 3 },
  { cat: 'c', amt: 20 },
];

describe('groupSum', () => {
  it('sums values per label in first-seen order', () => {
    expect(
      groupSum(
        rows,
        (r) => r.cat,
        (r) => r.amt,
      ),
    ).toEqual([
      { label: 'a', value: 13 },
      { label: 'b', value: 5 },
      { label: 'c', value: 20 },
    ]);
  });

  it('returns [] for no rows', () => {
    expect(
      groupSum(
        [],
        (r: { cat: string }) => r.cat,
        () => 1,
      ),
    ).toEqual([]);
  });
});

describe('countBy', () => {
  it('counts rows per label', () => {
    expect(countBy(rows, (r) => r.cat)).toEqual([
      { label: 'a', value: 2 },
      { label: 'b', value: 1 },
      { label: 'c', value: 1 },
    ]);
  });
});

describe('topN', () => {
  const data = [
    { label: 'a', value: 1 },
    { label: 'b', value: 8 },
    { label: 'c', value: 4 },
    { label: 'd', value: 2 },
  ];

  it('keeps the n largest and folds the rest into Other', () => {
    expect(topN(data, 2)).toEqual([
      { label: 'b', value: 8 },
      { label: 'c', value: 4 },
      { label: 'Other', value: 3 },
    ]);
  });

  it('just sorts when data fits in n', () => {
    expect(topN(data, 4)).toEqual([
      { label: 'b', value: 8 },
      { label: 'c', value: 4 },
      { label: 'd', value: 2 },
      { label: 'a', value: 1 },
    ]);
  });

  it('omits an empty Other bucket', () => {
    const d = [
      { label: 'a', value: 5 },
      { label: 'b', value: 0 },
    ];
    expect(topN(d, 1)).toEqual([{ label: 'a', value: 5 }]);
  });
});
