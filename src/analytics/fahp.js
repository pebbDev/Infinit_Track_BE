import AHP from 'ahp';

export function mulTFN([l1, m1, u1], [l2, m2, u2]) {
  return [l1 * l2, m1 * m2, u1 * u2];
}

export function powTFN([l, m, u], p) {
  return [l ** p, m ** p, u ** p];
}

export function invTFN([l, m, u]) {
  return [1 / u, 1 / m, 1 / l];
}

export function centroidTFN([l, m, u]) {
  return (l + 4 * m + u) / 6;
}

export function defuzzifyMatrixTFN(matrixTFN) {
  return matrixTFN.map((row) => row.map((tfn) => centroidTFN(tfn)));
}

export function fgmWeightsTFN(matrixTFN) {
  const n = matrixTFN.length;
  const geometricMeans = Array.from({ length: n }, () => [1, 1, 1]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      geometricMeans[i] = mulTFN(geometricMeans[i], matrixTFN[i][j]);
    }
    geometricMeans[i] = powTFN(geometricMeans[i], 1 / n);
  }

  const crisp = geometricMeans.map((g) => centroidTFN(g));
  const sum = crisp.reduce((a, b) => a + b, 0) || 1;
  return crisp.map((v) => v / sum);
}

// Internal CR computation (fallback)
export function computeCR(matrix) {
  const n = matrix.length;
  if (n === 0) return { CI: 0, CR: 0, lambdaMax: 0 };

  let w = Array.from({ length: n }, () => 1 / n);
  const maxIter = 100;
  for (let iter = 0; iter < maxIter; iter++) {
    const Aw = Array.from({ length: n }, (_, i) => {
      let s = 0;
      for (let j = 0; j < n; j++) s += matrix[i][j] * w[j];
      return s;
    });
    const sumAw = Aw.reduce((a, b) => a + b, 0) || 1;
    w = Aw.map((v) => v / sumAw);
  }
  const AwFinal = Array.from({ length: n }, (_, i) => {
    let s = 0;
    for (let j = 0; j < n; j++) s += matrix[i][j] * w[j];
    return s;
  });
  const lambdas = AwFinal.map((v, i) => v / (w[i] || 1e-12));
  const lambdaMax = lambdas.reduce((a, b) => a + b, 0) / n;
  const CI = (lambdaMax - n) / (n - 1 || 1);
  const RI_TABLE = { 1: 0.0, 2: 0.0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49, 11: 1.51, 12: 1.48, 13: 1.56, 14: 1.57, 15: 1.59 };
  const RI = RI_TABLE[n] ?? 1.59;
  const CR = RI === 0 ? 0 : CI / RI;
  return { CI, CR, lambdaMax };
}

// Preferred CR computation via 'ahp' library, with fallback
export function computeCRWithAHP(matrixCrisp) {
  try {
    const n = matrixCrisp.length;
    if (!n) return { CI: 0, CR: 0, lambdaMax: 0 };
    const criteria = Array.from({ length: n }, (_, i) => `c${i + 1}`);
    const comparisons = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        comparisons.push([criteria[i], criteria[j], matrixCrisp[i][j]]);
      }
    }
    const ahp = new AHP();
    ahp.addCriteria(criteria);
    ahp.addItems(['dummy']);
    ahp.rankCriteria(comparisons);
    criteria.forEach((c) => ahp.rankCriteriaItem(c, [['dummy', 'dummy', 1]]));
    const result = ahp.run();
    // Try to read CR from library result (common fields)
    const CR = result?.criteriaRankMetaMap?.consistencyRatio ?? result?.consistencyRatio ?? null;
    if (typeof CR === 'number') {
      // CI not always exposed; estimate via fallback lambda if needed
      return { CI: null, CR, lambdaMax: null };
    }
    // Fallback to internal computation if library CR not exposed
    return computeCR(matrixCrisp);
  } catch (e) {
    return computeCR(matrixCrisp);
  }
}