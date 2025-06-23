/**
 * Smart Checkout Engine - Unified Fuzzy AHP Implementation
 * Menggunakan AHP library dengan Fuzzy Logic untuk prediksi waktu check-out yang cerdas
 * Filosofi: CEO (AHP) + Manajer Ahli (Fuzzy Logic) untuk Work Duration Prediction
 */

import AHP from 'ahp';
import { Triangle } from 'fuzzylogic';

import logger from './logger.js';

// ========================= FUZZY LOGIC COMPONENTS =========================

/**
 * Fuzzy sets configuration untuk prediksi durasi kerja
 */
const FUZZY_SETS = {
  // Waktu check-in (dalam jam, format 24 jam)
  checkinTime: {
    pagi: new Triangle(6, 8, 10), // 06:00 - 10:00 (optimal work start)
    siang: new Triangle(9, 12, 15), // 09:00 - 15:00 (mid-day start)
    sore: new Triangle(14, 17, 20), // 14:00 - 20:00 (late start)
    malam: new Triangle(18, 22, 24) // 18:00 - 24:00 (very late start)
  },

  // Rata-rata jam kerja historis (dalam jam)
  historicalHours: {
    pendek: new Triangle(1, 3, 5), // 1-5 jam (part-time/short work)
    normal: new Triangle(4, 8, 10), // 4-10 jam (standard work)
    panjang: new Triangle(8, 12, 16), // 8-16 jam (overtime/long work)
    ekstrem: new Triangle(12, 16, 24) // 12-24 jam (very long work)
  },

  // Hari dalam seminggu (0=Minggu, 6=Sabtu)
  dayOfWeek: {
    weekend: new Triangle(0, 0, 1), // Sabtu-Minggu
    awalMinggu: new Triangle(0, 1, 3), // Minggu-Selasa
    tengahMinggu: new Triangle(2, 3, 4), // Selasa-Kamis
    akhirMinggu: new Triangle(3, 5, 6) // Kamis-Sabtu
  },

  // Frekuensi transisi lokasi (movement count)
  transitionCount: {
    rendah: new Triangle(0, 2, 5), // Jarang berpindah (static work)
    sedang: new Triangle(3, 8, 15), // Berpindah normal
    tinggi: new Triangle(10, 20, 30), // Sering berpindah (mobile work)
    sangatTinggi: new Triangle(25, 50, 100) // Sangat aktif berpindah
  },

  // Output: Prediksi durasi kerja (dalam jam)
  workDuration: {
    sangatPendek: new Triangle(1, 2, 4), // 1-4 jam
    pendek: new Triangle(3, 5, 7), // 3-7 jam
    normal: new Triangle(6, 8, 10), // 6-10 jam (standard 8 jam)
    panjang: new Triangle(8, 11, 14), // 8-14 jam
    sangatPanjang: new Triangle(12, 16, 20) // 12-20 jam
  }
};

// ========================= AHP CONFIGURATION =========================

/**
 * Work Duration Prediction Criteria definitions
 */
const PREDICTION_CRITERIA = {
  checkinTime: 'Waktu check-in (pengaruh terhadap durasi kerja)',
  historicalPattern: 'Pola historis jam kerja pengguna',
  dayContext: 'Konteks hari (weekday vs weekend)',
  mobility: 'Mobilitas/aktivitas perpindahan lokasi'
};

/**
 * Expert judgment matrix untuk perbandingan kriteria prediksi
 * Bobot: Historical Pattern (40%) > Check-in Time (30%) > Day Context (20%) > Mobility (10%)
 */
const PREDICTION_COMPARISON_MATRIX = [
  //                checkinTime  historicalPattern  dayContext  mobility
  /* checkinTime */ [1, 2, 3, 5],
  /* historicalPattern */ [1 / 2, 1, 2, 4],
  /* dayContext */ [1 / 3, 1 / 2, 1, 3],
  /* mobility */ [1 / 5, 1 / 4, 1 / 3, 1]
];

/**
 * Criteria alternatives configuration untuk setiap faktor prediksi
 */
const PREDICTION_ALTERNATIVES = {
  checkinTime: {
    alternatives: ['pagi', 'siang', 'sore', 'malam'],
    matrix: [
      //        pagi  siang  sore  malam
      /* pagi */ [1, 2, 3, 5], // Pagi -> durasi kerja paling panjang
      /* siang */ [1 / 2, 1, 2, 3], // Siang -> durasi sedang-panjang
      /* sore */ [1 / 3, 1 / 2, 1, 2], // Sore -> durasi pendek-sedang
      /* malam */ [1 / 5, 1 / 3, 1 / 2, 1] // Malam -> durasi paling pendek
    ]
  },
  historicalPattern: {
    alternatives: ['pendek', 'normal', 'panjang', 'ekstrem'],
    matrix: [
      //          pendek  normal  panjang  ekstrem
      /* pendek */ [1, 1 / 3, 1 / 5, 1 / 7], // Historical pendek -> prediksi pendek
      /* normal */ [3, 1, 1 / 2, 1 / 3], // Historical normal -> prediksi normal
      /* panjang */ [5, 2, 1, 1 / 2], // Historical panjang -> prediksi panjang
      /* ekstrem */ [7, 3, 2, 1] // Historical ekstrem -> prediksi ekstrem
    ]
  },
  dayContext: {
    alternatives: ['weekend', 'awalMinggu', 'tengahMinggu', 'akhirMinggu'],
    matrix: [
      //              weekend  awalMinggu  tengahMinggu  akhirMinggu
      /* weekend */ [1, 1 / 2, 1 / 3, 1 / 4], // Weekend -> durasi pendek
      /* awalMinggu */ [2, 1, 1 / 2, 1 / 3], // Awal minggu -> sedang
      /* tengahMinggu */ [3, 2, 1, 1 / 2], // Tengah minggu -> panjang
      /* akhirMinggu */ [4, 3, 2, 1] // Akhir minggu -> paling panjang
    ]
  },
  mobility: {
    alternatives: ['rendah', 'sedang', 'tinggi', 'sangatTinggi'],
    matrix: [
      //              rendah  sedang  tinggi  sangatTinggi
      /* rendah */ [1, 2, 3, 5], // Mobilitas rendah -> durasi panjang
      /* sedang */ [1 / 2, 1, 2, 3], // Mobilitas sedang -> durasi normal
      /* tinggi */ [1 / 3, 1 / 2, 1, 2], // Mobilitas tinggi -> durasi pendek
      /* sangatTinggi */ [1 / 5, 1 / 3, 1 / 2, 1] // Sangat tinggi -> sangat pendek
    ]
  }
};

// ========================= AHP INSTANCES =========================

let criteriaWeights = null;
let alternativeWeights = {};

/**
 * Setup AHP instances untuk prediction criteria dan alternatives
 */
const setupPredictionAHP = () => {
  try {
    // Step 1: Calculate criteria weights
    const mainAHP = new AHP();
    const criteriaNames = Object.keys(PREDICTION_CRITERIA);

    mainAHP.addCriteria(criteriaNames);
    mainAHP.addItems(['dummy_item']);

    // Set criteria comparisons
    const criteriaComparisons = [];
    for (let i = 0; i < criteriaNames.length; i++) {
      for (let j = i + 1; j < criteriaNames.length; j++) {
        criteriaComparisons.push([
          criteriaNames[i],
          criteriaNames[j],
          PREDICTION_COMPARISON_MATRIX[i][j]
        ]);
      }
    }

    mainAHP.rankCriteria(criteriaComparisons);

    // Add dummy item comparisons
    criteriaNames.forEach((criteria) => {
      mainAHP.rankCriteriaItem(criteria, [['dummy_item', 'dummy_item', 1]]);
    });

    const mainResult = mainAHP.run();

    // Extract criteria weights
    criteriaWeights = {};
    criteriaNames.forEach((criteria, index) => {
      criteriaWeights[criteria] = mainResult.criteriaRankMetaMap.weightedVector[index];
    });

    // Step 2: Calculate alternative weights untuk setiap criteria
    alternativeWeights = {};

    Object.keys(PREDICTION_ALTERNATIVES).forEach((criteriaName) => {
      const config = PREDICTION_ALTERNATIVES[criteriaName];
      const criteriaAHP = new AHP();

      criteriaAHP.addCriteria(['dummy_criteria']);
      criteriaAHP.addItems(config.alternatives);

      criteriaAHP.rankCriteria([['dummy_criteria', 'dummy_criteria', 1]]);

      const alternativeComparisons = [];
      for (let i = 0; i < config.alternatives.length; i++) {
        for (let j = i + 1; j < config.alternatives.length; j++) {
          alternativeComparisons.push([
            config.alternatives[i],
            config.alternatives[j],
            config.matrix[i][j]
          ]);
        }
      }

      criteriaAHP.rankCriteriaItem('dummy_criteria', alternativeComparisons);
      const criteriaResult = criteriaAHP.run();

      alternativeWeights[criteriaName] = {};
      config.alternatives.forEach((alternative) => {
        alternativeWeights[criteriaName][alternative] =
          criteriaResult.rankedScoreMap[alternative] || 0;
      });
    });

    logger.info('Smart Checkout AHP instances berhasil diinisialisasi', {
      criteriaWeights,
      mainConsistencyRatio: mainResult.criteriaRankMetaMap.cr,
      alternativeWeights
    });
  } catch (error) {
    logger.error('Error setting up Prediction AHP instances:', error);
    throw error;
  }
};

// ========================= FUZZY EVALUATION FUNCTIONS =========================

/**
 * Evaluate fuzzy membership untuk setiap input
 */
const evaluateFuzzyMembership = (value, fuzzySet) => {
  const memberships = {};

  Object.keys(fuzzySet).forEach((label) => {
    const triangularFunction = fuzzySet[label];
    memberships[label] = triangularFunction.evaluate(value);
  });

  return memberships;
};

/**
 * Kategorisasi input berdasarkan fuzzy membership tertinggi
 */
const categorizeInput = (value, fuzzySet) => {
  const memberships = evaluateFuzzyMembership(value, fuzzySet);

  // Cari kategori dengan membership tertinggi
  let maxMembership = 0;
  let bestCategory = Object.keys(fuzzySet)[0];

  Object.keys(memberships).forEach((category) => {
    if (memberships[category] > maxMembership) {
      maxMembership = memberships[category];
      bestCategory = category;
    }
  });

  return {
    category: bestCategory,
    membership: maxMembership,
    allMemberships: memberships
  };
};

// ========================= FUZZY RULES ENGINE =========================

/**
 * Fuzzy rules untuk prediksi durasi kerja
 */
const FUZZY_RULES = [
  // Rules berdasarkan waktu check-in
  {
    conditions: { checkinTime: 'pagi' },
    conclusion: 'normal',
    weight: 0.8,
    description: 'Check-in pagi biasanya menghasilkan durasi kerja normal'
  },
  {
    conditions: { checkinTime: 'siang' },
    conclusion: 'pendek',
    weight: 0.7,
    description: 'Check-in siang menghasilkan durasi kerja lebih pendek'
  },
  {
    conditions: { checkinTime: 'sore' },
    conclusion: 'sangatPendek',
    weight: 0.9,
    description: 'Check-in sore menghasilkan durasi kerja sangat pendek'
  },
  {
    conditions: { checkinTime: 'malam' },
    conclusion: 'sangatPendek',
    weight: 0.95,
    description: 'Check-in malam menghasilkan durasi kerja sangat pendek'
  },

  // Rules berdasarkan historical pattern
  {
    conditions: { historicalPattern: 'pendek' },
    conclusion: 'pendek',
    weight: 0.9,
    description: 'Pola historis pendek cenderung konsisten'
  },
  {
    conditions: { historicalPattern: 'normal' },
    conclusion: 'normal',
    weight: 0.85,
    description: 'Pola historis normal cenderung konsisten'
  },
  {
    conditions: { historicalPattern: 'panjang' },
    conclusion: 'panjang',
    weight: 0.8,
    description: 'Pola historis panjang cenderung konsisten'
  },

  // Rules berdasarkan day context
  {
    conditions: { dayContext: 'weekend' },
    conclusion: 'pendek',
    weight: 0.7,
    description: 'Weekend biasanya durasi kerja lebih pendek'
  },
  {
    conditions: { dayContext: 'tengahMinggu' },
    conclusion: 'panjang',
    weight: 0.6,
    description: 'Tengah minggu biasanya durasi kerja panjang'
  },

  // Rules berdasarkan mobility
  {
    conditions: { mobility: 'rendah' },
    conclusion: 'panjang',
    weight: 0.6,
    description: 'Mobilitas rendah mengindikasikan kerja fokus/panjang'
  },
  {
    conditions: { mobility: 'sangatTinggi' },
    conclusion: 'sangatPendek',
    weight: 0.7,
    description: 'Mobilitas sangat tinggi mengindikasikan kerja singkat'
  },

  // Kombinasi rules
  {
    conditions: { checkinTime: 'pagi', dayContext: 'tengahMinggu' },
    conclusion: 'panjang',
    weight: 0.9,
    description: 'Check-in pagi di tengah minggu -> durasi panjang'
  },
  {
    conditions: { checkinTime: 'sore', dayContext: 'weekend' },
    conclusion: 'sangatPendek',
    weight: 0.95,
    description: 'Check-in sore di weekend -> durasi sangat pendek'
  }
];

/**
 * Apply fuzzy rules dengan AHP weights
 */
const applyFuzzyRules = (inputCategories, _inputMemberships) => {
  const ruleActivations = [];

  FUZZY_RULES.forEach((rule, index) => {
    let ruleStrength = 1.0;
    let applicable = true;

    // Check if rule conditions match input categories
    Object.keys(rule.conditions).forEach((criteria) => {
      const expectedValue = rule.conditions[criteria];

      if (inputCategories[criteria]) {
        const actualCategory = inputCategories[criteria].category;
        const membership = inputCategories[criteria].membership;

        if (actualCategory === expectedValue) {
          // Rule applies, use membership strength
          ruleStrength = Math.min(ruleStrength, membership);
        } else {
          // Rule doesn't apply strongly
          applicable = false;
        }
      }
    });

    if (applicable && ruleStrength > 0.1) {
      // Threshold untuk rule activation
      ruleActivations.push({
        ruleIndex: index,
        conclusion: rule.conclusion,
        strength: ruleStrength * rule.weight,
        description: rule.description
      });
    }
  });

  return ruleActivations;
};

// ========================= DEFUZZIFICATION =========================

/**
 * Defuzzification menggunakan weighted average method
 */
const defuzzifyWorkDuration = (ruleActivations) => {
  const durationCentroids = {
    sangatPendek: 2.5, // Average of triangle (1,2,4)
    pendek: 5.0, // Average of triangle (3,5,7)
    normal: 8.0, // Average of triangle (6,8,10)
    panjang: 11.0, // Average of triangle (8,11,14)
    sangatPanjang: 16.0 // Average of triangle (12,16,20)
  };

  if (ruleActivations.length === 0) {
    // Default fallback: 8 jam kerja normal
    return {
      predictedHours: 8.0,
      confidence: 0.5,
      activatedRules: [],
      methodology: 'Default fallback - no rules activated'
    };
  }

  // Weighted average calculation
  let numerator = 0;
  let denominator = 0;

  ruleActivations.forEach((activation) => {
    const centroid = durationCentroids[activation.conclusion];
    numerator += activation.strength * centroid;
    denominator += activation.strength;
  });

  const predictedHours = denominator > 0 ? numerator / denominator : 8.0;
  const confidence = Math.min(denominator / ruleActivations.length, 1.0);

  return {
    predictedHours: Math.round(predictedHours * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    activatedRules: ruleActivations,
    methodology: 'Fuzzy AHP Weighted Average Defuzzification'
  };
};

// ========================= MAIN PREDICTION ENGINE =========================

/**
 * Predict work duration menggunakan Fuzzy AHP terintegrasi
 */
const predictWorkDuration = async (params) => {
  try {
    const { checkinTime, historicalHours, dayOfWeek, transitionCount } = params;

    // Step 1: Kategorisasi semua inputs menggunakan fuzzy sets
    const inputCategories = {
      checkinTime: categorizeInput(checkinTime, FUZZY_SETS.checkinTime),
      historicalPattern: categorizeInput(historicalHours, FUZZY_SETS.historicalHours),
      dayContext: categorizeInput(dayOfWeek, FUZZY_SETS.dayOfWeek),
      mobility: categorizeInput(transitionCount, FUZZY_SETS.transitionCount)
    };

    // Step 2: Apply fuzzy rules
    const inputMemberships = {
      checkinTime: evaluateFuzzyMembership(checkinTime, FUZZY_SETS.checkinTime),
      historicalPattern: evaluateFuzzyMembership(historicalHours, FUZZY_SETS.historicalHours),
      dayContext: evaluateFuzzyMembership(dayOfWeek, FUZZY_SETS.dayOfWeek),
      mobility: evaluateFuzzyMembership(transitionCount, FUZZY_SETS.transitionCount)
    };

    const ruleActivations = applyFuzzyRules(inputCategories, inputMemberships);

    // Step 3: Apply AHP weights to rule activations
    if (criteriaWeights) {
      ruleActivations.forEach((activation) => {
        // Weight berdasarkan criteria yang terlibat dalam rule
        let ahpWeight = 1.0;

        const ruleConditions = FUZZY_RULES[activation.ruleIndex].conditions;
        Object.keys(ruleConditions).forEach((criteria) => {
          if (criteriaWeights[criteria]) {
            ahpWeight *= 1 + criteriaWeights[criteria]; // Boost based on AHP weight
          }
        });

        activation.strength *= ahpWeight;
      });
    }

    // Step 4: Defuzzification
    const result = defuzzifyWorkDuration(ruleActivations);

    // Step 5: Boundary checks dan enhancement
    let finalPrediction = result.predictedHours;

    // Ensure realistic bounds (minimum 1 jam, maximum 16 jam)
    finalPrediction = Math.max(1, Math.min(16, finalPrediction));

    // Enhancement berdasarkan business logic
    const enhancement = calculateBusinessEnhancement(params, inputCategories);
    finalPrediction *= enhancement.multiplier;

    // Final boundary check
    finalPrediction = Math.max(1, Math.min(16, finalPrediction));

    return {
      predictedDuration: Math.round(finalPrediction * 100) / 100,
      confidence: result.confidence,
      details: {
        inputCategories,
        inputMemberships,
        activatedRules: result.activatedRules,
        ahpWeights: criteriaWeights,
        businessEnhancement: enhancement,
        methodology: result.methodology
      }
    };
  } catch (error) {
    logger.error('Error in predictWorkDuration:', error);

    // Fallback calculation
    return {
      predictedDuration: 8.0,
      confidence: 0.5,
      details: {
        error: error.message,
        methodology: 'Fallback - Fixed 8 hours due to error'
      }
    };
  }
};

/**
 * Business logic enhancement berdasarkan context tambahan
 */
const calculateBusinessEnhancement = (params, inputCategories) => {
  let multiplier = 1.0;
  const reasons = [];

  // Enhancement berdasarkan historical pattern consistency
  if (inputCategories.historicalPattern.membership > 0.8) {
    multiplier *= 1.1; // Boost jika historical pattern sangat jelas
    reasons.push('Strong historical pattern consistency');
  }

  // Enhancement berdasarkan day context
  if (inputCategories.dayContext.category === 'weekend') {
    multiplier *= 0.8; // Reduce untuk weekend
    reasons.push('Weekend work typically shorter');
  } else if (inputCategories.dayContext.category === 'tengahMinggu') {
    multiplier *= 1.1; // Boost untuk tengah minggu
    reasons.push('Mid-week work typically longer');
  }

  // Enhancement berdasarkan mobility patterns
  if (inputCategories.mobility.category === 'sangatTinggi') {
    multiplier *= 0.7; // Sangat mobile = kerja singkat
    reasons.push('High mobility indicates shorter work duration');
  } else if (inputCategories.mobility.category === 'rendah') {
    multiplier *= 1.2; // Low mobility = kerja fokus/panjang
    reasons.push('Low mobility indicates focused/longer work');
  }

  // Ensure multiplier stays within reasonable bounds
  multiplier = Math.max(0.5, Math.min(1.5, multiplier));

  return {
    multiplier: Math.round(multiplier * 100) / 100,
    reasons
  };
};

// ========================= INITIALIZATION & EXPORTS =========================

/**
 * Initialize Smart Checkout Engine
 */
const initializeSmartCheckoutEngine = () => {
  setupPredictionAHP();
};

/**
 * Get prediction criteria weights
 */
const getPredictionWeights = () => {
  if (!criteriaWeights) {
    throw new Error('Smart Checkout AHP not initialized');
  }

  return {
    weights: criteriaWeights,
    alternatives: alternativeWeights
  };
};

/**
 * Get configuration untuk debugging
 */
const getSmartCheckoutConfig = () => {
  return {
    criteria: PREDICTION_CRITERIA,
    comparison_matrix: PREDICTION_COMPARISON_MATRIX,
    alternatives: PREDICTION_ALTERNATIVES,
    fuzzy_sets: Object.keys(FUZZY_SETS),
    fuzzy_rules_count: FUZZY_RULES.length,
    weights: criteriaWeights,
    alternative_weights: alternativeWeights
  };
};

// ========================= EXPORTS =========================

export {
  initializeSmartCheckoutEngine,
  predictWorkDuration,
  getPredictionWeights,
  getSmartCheckoutConfig,
  FUZZY_SETS,
  PREDICTION_CRITERIA,
  FUZZY_RULES
};

export default {
  initializeSmartCheckoutEngine,
  predictWorkDuration,
  getPredictionWeights,
  getSmartCheckoutConfig
};
