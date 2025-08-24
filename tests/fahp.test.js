import { fgmWeightsTFN, computeCR } from '../src/analytics/fahp.js';
import { TFN } from '../src/analytics/config.fahp.js';

test('FGM produces normalized weights (sum=1)', () => {
  const M = [
    [TFN.M, TFN.H, TFN.VH],
    [[1 / 4, 1 / 3, 1 / 2], TFN.M, TFN.H],
    [[1 / 7, 1 / 5, 1 / 3], [1 / 4, 1 / 3, 1 / 2], TFN.M]
  ];
  const w = fgmWeightsTFN(M);
  const sum = w.reduce((a, b) => a + b, 0);
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
});

test('CR is small for near-consistent matrix', () => {
  const M = [
    [1, 3, 5],
    [1 / 3, 1, 3],
    [1 / 5, 1 / 3, 1]
  ];
  const { CR } = computeCR(M);
  expect(CR).toBeLessThan(0.1);
});