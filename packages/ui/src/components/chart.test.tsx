// Tests for chart.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BarChart, DonutChart, LineChart, Sparkline } from './chart';

const data = [
  { label: 'a', value: 10 },
  { label: 'b', value: 20 },
  { label: 'c', value: 5 },
];
const count = (html: string, tag: string) => html.split(`<${tag}`).length - 1;

describe('BarChart', () => {
  it('renders one bar (rect) per datum with a hover title', () => {
    const html = renderToStaticMarkup(<BarChart data={data} />);
    expect(count(html, 'rect')).toBe(3);
    expect(html).toContain('<title>a: 10</title>');
  });

  it('does not divide by zero on empty data', () => {
    expect(() => renderToStaticMarkup(<BarChart data={[]} />)).not.toThrow();
  });
});

describe('LineChart', () => {
  it('draws a marker per point and an area fill by default', () => {
    const html = renderToStaticMarkup(<LineChart data={data} />);
    expect(count(html, 'circle')).toBe(3);
    expect(count(html, 'path')).toBe(2); // area + line
  });

  it('drops the area when area={false}', () => {
    const html = renderToStaticMarkup(<LineChart data={data} area={false} />);
    expect(count(html, 'path')).toBe(1);
  });

  it('handles a single point and negative values without throwing', () => {
    expect(() =>
      renderToStaticMarkup(<LineChart data={[{ label: 'x', value: 3 }]} />),
    ).not.toThrow();
    expect(() =>
      renderToStaticMarkup(
        <LineChart
          data={[
            { label: 'x', value: -5 },
            { label: 'y', value: 5 },
          ]}
        />,
      ),
    ).not.toThrow();
  });
});

describe('DonutChart', () => {
  it('renders one arc per slice, a legend, and the total', () => {
    const html = renderToStaticMarkup(<DonutChart data={data} valueFormat={(v) => `$${v}`} />);
    expect(count(html, 'path')).toBe(3);
    expect(html).toContain('$35'); // total in the center
  });

  it('survives all-zero data (no slices, total 0)', () => {
    const html = renderToStaticMarkup(<DonutChart data={[{ label: 'a', value: 0 }]} />);
    expect(html).toContain('>0<');
  });
});

describe('Sparkline', () => {
  it('renders a polyline path for 2+ points, nothing for fewer', () => {
    expect(renderToStaticMarkup(<Sparkline data={[1, 2, 3]} />)).toContain('<path');
    expect(renderToStaticMarkup(<Sparkline data={[1]} />)).toBe('');
  });
});
