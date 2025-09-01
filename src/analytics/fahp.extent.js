// FAHP (Chang's Extent Analysis) for TFN matrices
// Produces normalized crisp weights (sum to 1)

import { mulTFN, invTFN } from './fahp.js';

// Add two TFNs component-wise
function addTFN([l1, m1, u1], [l2, m2, u2]) {
  return [l1 + l2, m1 + m2, u1 + u2];
}

// Sum array of TFNs
function sumTFNs(tfnArray) {
  return tfnArray.reduce((acc, t) => addTFN(acc, t), [0, 0, 0]);
}

// Degree of possibility V(A >= B) for TFNs A(l1,m1,u1), B(l2,m2,u2)
// Common definition:
// - if m1 >= m2 => 1
// - else if l2 >= u1 => 0
// - else => (u1 - l2) / ((u1 - m1) + (m2 - l2))
function possibilityGE([_l1, m1, u1], [l2, m2, _u2]) {
  if (m1 >= m2) return 1;
  if (l2 >= u1) return 0;
  const denom = u1 - m1 + (m2 - l2);
  if (denom <= 0) return 0; // guard
  const v = (u1 - l2) / denom;
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

// Compute weights using Chang's extent analysis for TFN pairwise matrix
export function extentWeightsTFN(matrixTFN) {
  const n = matrixTFN.length;
  if (!Array.isArray(matrixTFN) || n === 0) return [];

  // 1) Row fuzzy sums S_i = sum_j a_ij
  const rowSums = matrixTFN.map((row) => sumTFNs(row));

  // 2) Total fuzzy sum T = sum_i S_i, and its inverse
  const total = sumTFNs(rowSums);
  const invTotal = invTFN(total);

  // 3) Synthetic extent E_i = S_i ⊗ T^{-1}
  const extents = rowSums.map((s) => mulTFN(s, invTotal));

  // 4) For each i compute d_i = min_{j!=i} V(E_i >= E_j)
  const d = Array.from({ length: n }, (_, i) => {
    let minV = 1;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const v = possibilityGE(extents[i], extents[j]);
      if (v < minV) minV = v;
      if (minV === 0) break;
    }
    return minV;
  });

  // 5) Normalize to get crisp weights
  const sumD = d.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 1;
  return d.map((x) => (Number.isFinite(x) ? x / sumD : 0));
}

export default {
  extentWeightsTFN
};
