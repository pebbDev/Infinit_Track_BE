/**
 * WFA Recommendation Engine - Optimized & Concise
 *
 * Efficient WFA engine using AHP library for weight calculation and fuzzy logic for inference.
 * Refactored for conciseness while maintaining library usage.
 *
 * CONFIGURATION (Updated June 29, 2025):
 * - Location Type: 70% | Distance: 23% | Amenity: 7%
 *
 * LOCATION CATEGORIES:
 * - Cafe: 100 | Library: 85 | Hotel: 75 | Restaurant: 65
 * - Mall: 60 | Park: 45 | Other: 40 | Coworking: REMOVED
 */

import AHP from 'ahp';
import fuzzylogic from 'fuzzylogic';

import logger from './logger.js';
import {
  assessInternetAccess,
  assessPhysicalComfort,
  assessPaymentOptionsCorrect
} from './amenityHelpers.js';

/**
 * Initialize WFA Fuzzy Logic System using fuzzylogic library
 */
function createWfaFuzzySystem() {
  // Define input fuzzy sets using fuzzylogic Triangle and Grade functions
  const locationTypeFS = {
    poor: new fuzzylogic.Triangle(0, 20, 40),
    fair: new fuzzylogic.Triangle(20, 50, 80),
    good: new fuzzylogic.Triangle(60, 85, 95),
    excellent: new fuzzylogic.Grade(85, 100) // Use Grade for excellent (rising from 85 to 100)
  };

  const distanceFS = {
    very_near: new fuzzylogic.Triangle(0, 100, 500),
    near: new fuzzylogic.Triangle(200, 1000, 2000),
    medium: new fuzzylogic.Triangle(1500, 3000, 5000),
    far: new fuzzylogic.Triangle(4000, 8000, 10000),
    very_far: new fuzzylogic.Grade(8000, 15000)
  };

  const amenityFS = {
    poor: new fuzzylogic.Triangle(0, 20, 40),
    fair: new fuzzylogic.Triangle(20, 50, 70),
    good: new fuzzylogic.Triangle(60, 80, 100)
  };

  // Define output fuzzy sets
  const recommendationFS = {
    not_recommended: new fuzzylogic.Triangle(0, 15, 30),
    low_recommended: new fuzzylogic.Triangle(20, 40, 60),
    recommended: new fuzzylogic.Triangle(50, 70, 85),
    highly_recommended: new fuzzylogic.Triangle(80, 95, 100)
  };

  return {
    inputSets: {
      location_type: locationTypeFS,
      distance: distanceFS,
      amenity: amenityFS
    },
    outputSets: {
      recommendation: recommendationFS
    }
  };
}

// Initialize fuzzy system globally
const wfaFuzzyLogic = createWfaFuzzySystem();

// ==========================================
// AHP WEIGHT CALCULATION
// ==========================================

/**
 * Calculate AHP weights for WFA criteria with NEW configuration
 * Target: Location Type (70%), Distance (23%), Amenity (7%)
 */

function getWfaAhpWeights() {
  try {
    const ahp = new AHP();
    const criteria = ['location_type', 'distance_factor', 'amenity_score'];

    // NEW comparison matrix for 70/23/7 distribution
    const comparisonMatrix = [
      ['location_type', 'distance_factor', 3], // 70% vs 23% ≈ 3:1
      ['location_type', 'amenity_score', 10], // 70% vs 7% = 10:1
      ['distance_factor', 'amenity_score', 3.3] // 23% vs 7% ≈ 3.3:1
    ];

    ahp.addCriteria(criteria);
    ahp.addItems(['dummy']);
    ahp.rankCriteria(comparisonMatrix);

    criteria.forEach((criterion) => {
      ahp.rankCriteriaItem(criterion, [['dummy', 'dummy', 1]]);
    });

    const result = ahp.run();
    const weights = result.criteriaRankMetaMap.weightedVector;

    logger.info('WFA AHP Weights (NEW):', {
      location_type: weights[0],
      distance_factor: weights[1],
      amenity_score: weights[2]
    });

    return {
      location_type: weights[0],
      distance_factor: weights[1],
      amenity_score: weights[2]
    };
  } catch (error) {
    logger.error('AHP calculation failed:', error);
    return { location_type: 0.7, distance_factor: 0.23, amenity_score: 0.07 };
  }
}

// ==========================================
// FUZZY LOGIC INFERENCE FUNCTIONS
// ==========================================

/**
 * Fuzzify input value using fuzzy membership functions from fuzzylogic library
 */
function fuzzifyInput(value, fuzzySets) {
  const membership = {};

  Object.entries(fuzzySets).forEach(([label, fuzzyObject]) => {
    // Call the evaluate method from fuzzylogic library
    membership[label] = fuzzyObject.evaluate(value);
  });

  return membership;
}

/**
 * Apply fuzzy rules and get aggregated output
 */
function applyFuzzyRules(inputs) {
  // This is where the fuzzy inference happens
  // Implementing simplified Mamdani inference
  const {
    location_type: locMembership,
    distance: distMembership,
    amenity: amenMembership
  } = inputs;

  let outputMembership = {
    not_recommended: 0,
    low_recommended: 0,
    recommended: 0,
    highly_recommended: 0
  };

  // Rule 1: IF location excellent AND distance very_near THEN highly_recommended
  const rule1 = Math.min(locMembership.excellent || 0, distMembership.very_near || 0);
  outputMembership.highly_recommended = Math.max(outputMembership.highly_recommended, rule1);

  // Rule 2: IF location excellent AND distance near THEN highly_recommended
  const rule2 = Math.min(locMembership.excellent || 0, distMembership.near || 0);
  outputMembership.highly_recommended = Math.max(outputMembership.highly_recommended, rule2);

  // Rule 3: IF location excellent AND distance medium THEN recommended
  const rule3 = Math.min(locMembership.excellent || 0, distMembership.medium || 0);
  outputMembership.recommended = Math.max(outputMembership.recommended, rule3);

  // Rule 4: IF location good AND distance very_near THEN highly_recommended
  const rule4 = Math.min(locMembership.good || 0, distMembership.very_near || 0);
  outputMembership.highly_recommended = Math.max(outputMembership.highly_recommended, rule4);

  // Rule 5: IF location good AND distance near THEN recommended
  const rule5 = Math.min(locMembership.good || 0, distMembership.near || 0);
  outputMembership.recommended = Math.max(outputMembership.recommended, rule5);

  // Rule 6: IF location fair AND distance very_near THEN recommended
  const rule6 = Math.min(locMembership.fair || 0, distMembership.very_near || 0);
  outputMembership.recommended = Math.max(outputMembership.recommended, rule6);

  // Rule 7: IF location fair AND distance near THEN low_recommended
  const rule7 = Math.min(locMembership.fair || 0, distMembership.near || 0);
  outputMembership.low_recommended = Math.max(outputMembership.low_recommended, rule7);

  // Rule 8: IF location poor OR distance very_far THEN not_recommended
  const rule8 = Math.max(locMembership.poor || 0, distMembership.very_far || 0);
  outputMembership.not_recommended = Math.max(outputMembership.not_recommended, rule8);

  // Amenity boost rules
  // Rule 9: IF location good AND amenity good THEN highly_recommended
  const rule9 = Math.min(locMembership.good || 0, amenMembership.good || 0);
  outputMembership.highly_recommended = Math.max(outputMembership.highly_recommended, rule9);

  // Rule 10: IF location fair AND amenity good THEN recommended
  const rule10 = Math.min(locMembership.fair || 0, amenMembership.good || 0);
  outputMembership.recommended = Math.max(outputMembership.recommended, rule10);

  return outputMembership;
}

/**
 * Defuzzify output using centroid method
 * Since we're using Triangle functions, we'll calculate centroids differently
 */
function defuzzifyOutput(outputMembership, _outputSets) {
  let numerator = 0;
  let denominator = 0;

  // Predefined centroids for our output sets (based on triangle centers)
  const centroids = {
    not_recommended: 15, // Center of (0, 0, 30)
    low_recommended: 40, // Center of (20, 40, 60)
    recommended: 68, // Center of (50, 70, 85)
    highly_recommended: 92 // Center of (80, 95, 100)
  };

  Object.entries(outputMembership).forEach(([label, membership]) => {
    if (membership > 0 && centroids[label]) {
      numerator += membership * centroids[label];
      denominator += membership;
    }
  });

  return denominator > 0 ? numerator / denominator : 50; // Default middle value
}

// ==========================================
// MAIN WFA CALCULATION WITH FUZZY LOGIC
// ==========================================

/**
 * Calculate WFA score using PROPER FUZZY LOGIC INFERENCE
 * This now uses fuzzy sets, rules, and defuzzification
 */
async function calculateWfaScore(placeDetails, ahpWeights = null) {
  try {
    const weights = ahpWeights || getWfaAhpWeights();

    // Calculate component scores (crisp values)
    const locationScore = calculateLocationTypeScore(placeDetails);
    const distanceScore = calculateDistanceScore(placeDetails);
    const amenityScore = calculateAmenityScore(placeDetails);

    // Extract numeric scores
    const typeScore = typeof locationScore === 'object' ? locationScore.score : locationScore;
    const distScore = typeof distanceScore === 'object' ? distanceScore.score : distanceScore;
    const amenScore = typeof amenityScore === 'object' ? amenityScore.score : amenityScore;

    // Convert distance score to actual distance for fuzzy logic
    const actualDistance = placeDetails.properties?.distance || 1000;

    // FUZZY LOGIC INFERENCE
    const { inputSets, outputSets } = wfaFuzzyLogic;

    // 1. FUZZIFICATION - Convert crisp inputs to fuzzy memberships
    const locationMembership = fuzzifyInput(typeScore, inputSets.location_type);
    const distanceMembership = fuzzifyInput(actualDistance, inputSets.distance);
    const amenityMembership = fuzzifyInput(amenScore, inputSets.amenity);

    logger.info(`Fuzzy Memberships - Location: ${JSON.stringify(locationMembership)}`);
    logger.info(`Distance (${actualDistance}m): ${JSON.stringify(distanceMembership)}`);
    logger.info(`Amenity: ${JSON.stringify(amenityMembership)}`);

    // 2. RULE APPLICATION - Apply fuzzy rules
    const fuzzyInputs = {
      location_type: locationMembership,
      distance: distanceMembership,
      amenity: amenityMembership
    };

    const outputMembership = applyFuzzyRules(fuzzyInputs);
    logger.info(`Output Memberships: ${JSON.stringify(outputMembership)}`);

    // 3. DEFUZZIFICATION - Convert fuzzy output to crisp score
    const fuzzyScore = defuzzifyOutput(outputMembership, outputSets.recommendation);

    // 4. HYBRID APPROACH - Combine fuzzy logic with AHP weights
    const ahpScore =
      typeScore * weights.location_type +
      distScore * weights.distance_factor +
      amenScore * weights.amenity_score;

    // Final score: 70% fuzzy logic + 30% AHP weighted average
    const finalScore = Math.min(100, Math.max(0, fuzzyScore * 0.7 + ahpScore * 0.3));

    const label = getWfaScoreLabel(finalScore);

    logger.info(
      `🧠 FUZZY WFA Score: ${finalScore.toFixed(1)} (${label}) for ${placeDetails.properties?.name || 'Unknown'}`
    );
    logger.info(
      `   Fuzzy Logic: ${fuzzyScore.toFixed(1)} | AHP: ${ahpScore.toFixed(1)} | Combined: ${finalScore.toFixed(1)}`
    );

    return {
      score: Math.round(finalScore * 100) / 100,
      label,
      breakdown: {
        location_score: Math.round(typeScore * 100) / 100,
        distance_score: Math.round(distScore * 100) / 100,
        amenity_score: Math.round(amenScore * 100) / 100,

        // Fuzzy logic details
        fuzzy_score: Math.round(fuzzyScore * 100) / 100,
        ahp_score: Math.round(ahpScore * 100) / 100,
        fuzzy_memberships: {
          location: locationMembership,
          distance: distanceMembership,
          amenity: amenityMembership
        },
        output_memberships: outputMembership,

        weights_used: weights
      }
    };
  } catch (error) {
    logger.error('Error calculating Fuzzy WFA score:', error);
    return {
      score: 50,
      label: 'Cukup Direkomendasikan',
      breakdown: { error: error.message }
    };
  }
}

/**
 * Calculate AHP weights for discipline criteria
 * Priority: Alpha > Keparahan Telat > Frekuensi Telat > Fokus Kerja
 */
function _calculateAhpWeights(matrix) {
  try {
    const ahp = new AHP();
    const criteria = matrix.criteria;
    const comparisons = matrix.comparisons;

    ahp.addCriteria(criteria);
    ahp.addItems(['dummy']);
    ahp.rankCriteria(comparisons);

    criteria.forEach((criterion) => {
      ahp.rankCriteriaItem(criterion, [['dummy', 'dummy', 1]]);
    });

    const result = ahp.run();
    const weights = result.criteriaRankMetaMap.weightedVector;

    const weightObj = {};
    criteria.forEach((criterion, index) => {
      weightObj[criterion] = weights[index];
    });

    return weightObj;
  } catch (error) {
    logger.error('AHP calculation failed:', error);
    // Return default weights
    const defaultWeights = {};
    matrix.criteria.forEach((criterion, index) => {
      defaultWeights[criterion] = matrix.defaultWeights[index];
    });
    return defaultWeights;
  }
}

/**
 * Initialize Discipline Fuzzy Logic System
 */
function createDisciplineFuzzySystem() {
  // Alpha Rate fuzzy sets (percentage of alpha days)
  const alphaRateFS = {
    rendah: new fuzzylogic.Triangle(0, 5, 15), // Low alpha rate (good)
    sedang: new fuzzylogic.Triangle(10, 20, 35), // Medium alpha rate
    tinggi: new fuzzylogic.Grade(30, 50) // High alpha rate (bad)
  };

  // Lateness Severity fuzzy sets (average minutes late)
  const latenessSeverityFS = {
    ringan: new fuzzylogic.Triangle(0, 5, 15), // Light lateness
    sedang: new fuzzylogic.Triangle(10, 20, 40), // Medium lateness
    berat: new fuzzylogic.Grade(35, 60) // Heavy lateness
  };

  // Lateness Frequency fuzzy sets (percentage of late days)
  const latenessFrequencyFS = {
    jarang: new fuzzylogic.Triangle(0, 10, 25), // Rarely late
    kadang: new fuzzylogic.Triangle(20, 35, 50), // Sometimes late
    sering: new fuzzylogic.Grade(45, 70) // Often late
  };

  // Work Focus fuzzy sets (work hour consistency score)
  const workFocusFS = {
    rendah: new fuzzylogic.Triangle(0, 30, 50), // Low focus
    sedang: new fuzzylogic.Triangle(40, 60, 80), // Medium focus
    tinggi: new fuzzylogic.Triangle(70, 85, 100) // High focus
  };

  // Output discipline score fuzzy sets
  const disciplineScoreFS = {
    sangat_buruk: new fuzzylogic.Triangle(0, 15, 30),
    buruk: new fuzzylogic.Triangle(20, 40, 60),
    cukup: new fuzzylogic.Triangle(50, 65, 80),
    baik: new fuzzylogic.Triangle(70, 85, 95),
    sangat_baik: new fuzzylogic.Grade(90, 100)
  };

  return {
    inputSets: {
      alpha_rate: alphaRateFS,
      lateness_severity: latenessSeverityFS,
      lateness_frequency: latenessFrequencyFS,
      work_focus: workFocusFS
    },
    outputSets: {
      discipline_score: disciplineScoreFS
    }
  };
}

// Initialize discipline fuzzy system globally
const disciplineFuzzyLogic = createDisciplineFuzzySystem();

/**
 * Apply fuzzy rules for discipline calculation
 */
function applyDisciplineFuzzyRules(inputs) {
  const {
    alpha_rate: alphaMembership,
    lateness_severity: severityMembership,
    lateness_frequency: frequencyMembership,
    work_focus: focusMembership
  } = inputs;

  let outputMembership = {
    sangat_buruk: 0,
    buruk: 0,
    cukup: 0,
    baik: 0,
    sangat_baik: 0
  };

  // Core Rules: Alpha rate is primary indicator
  // Rule 1: IF alpha_rate=tinggi THEN discipline=sangat_buruk
  const rule1 = alphaMembership.tinggi || 0;
  outputMembership.sangat_buruk = Math.max(outputMembership.sangat_buruk, rule1);

  // Rule 2: IF alpha_rate=sedang THEN discipline=buruk
  const rule2 = alphaMembership.sedang || 0;
  outputMembership.buruk = Math.max(outputMembership.buruk, rule2);

  // Rule 3: IF alpha_rate=rendah AND lateness_severity=berat THEN discipline=buruk
  const rule3 = Math.min(alphaMembership.rendah || 0, severityMembership.berat || 0);
  outputMembership.buruk = Math.max(outputMembership.buruk, rule3);

  // Rule 4: IF alpha_rate=rendah AND lateness_frequency=sering THEN discipline=cukup
  const rule4 = Math.min(alphaMembership.rendah || 0, frequencyMembership.sering || 0);
  outputMembership.cukup = Math.max(outputMembership.cukup, rule4);

  // Rule 5: IF alpha_rate=rendah AND lateness_severity=sedang AND lateness_frequency=kadang THEN discipline=cukup
  const rule5 = Math.min(
    alphaMembership.rendah || 0,
    Math.min(severityMembership.sedang || 0, frequencyMembership.kadang || 0)
  );
  outputMembership.cukup = Math.max(outputMembership.cukup, rule5);

  // Rule 6: IF alpha_rate=rendah AND lateness_severity=ringan AND work_focus=tinggi THEN discipline=baik
  const rule6 = Math.min(
    alphaMembership.rendah || 0,
    Math.min(severityMembership.ringan || 0, focusMembership.tinggi || 0)
  );
  outputMembership.baik = Math.max(outputMembership.baik, rule6);

  // Rule 7: IF alpha_rate=rendah AND lateness_frequency=jarang AND work_focus=tinggi THEN discipline=sangat_baik
  const rule7 = Math.min(
    alphaMembership.rendah || 0,
    Math.min(frequencyMembership.jarang || 0, focusMembership.tinggi || 0)
  );
  outputMembership.sangat_baik = Math.max(outputMembership.sangat_baik, rule7);

  // Rule 8: IF work_focus=tinggi AND lateness_frequency=jarang AND lateness_severity=ringan THEN discipline=sangat_baik
  const rule8 = Math.min(
    focusMembership.tinggi || 0,
    Math.min(frequencyMembership.jarang || 0, severityMembership.ringan || 0)
  );
  outputMembership.sangat_baik = Math.max(outputMembership.sangat_baik, rule8);

  // Rule 9: IF work_focus=rendah THEN discipline=buruk
  const rule9 = focusMembership.rendah || 0;
  outputMembership.buruk = Math.max(outputMembership.buruk, rule9 * 0.7);

  // Rule 10: IF work_focus=sedang AND lateness_frequency=kadang THEN discipline=cukup
  const rule10 = Math.min(focusMembership.sedang || 0, frequencyMembership.kadang || 0);
  outputMembership.cukup = Math.max(outputMembership.cukup, rule10);

  return outputMembership;
}

/**
 * Defuzzify discipline output
 */
function defuzzifyDisciplineOutput(outputMembership) {
  let numerator = 0;
  let denominator = 0;

  // Predefined centroids for discipline fuzzy sets
  const centroids = {
    sangat_buruk: 15, // Center of (0, 15, 30)
    buruk: 40, // Center of (20, 40, 60)
    cukup: 65, // Center of (50, 65, 80)
    baik: 85, // Center of (70, 85, 95)
    sangat_baik: 95 // Center of (90, 95, 100)
  };

  Object.entries(outputMembership).forEach(([label, membership]) => {
    if (membership > 0 && centroids[label]) {
      numerator += membership * centroids[label];
      denominator += membership;
    }
  });

  return denominator > 0 ? numerator / denominator : 65; // Default middle value
}

/**
 * Enhanced Discipline Index Calculation using Fuzzy AHP
 * Integrates fuzzy logic with AHP weights for comprehensive discipline assessment
 */
async function calculateDisciplineIndex(userMetrics) {
  try {
    // Define AHP matrix for discipline criteria
    const disciplineMatrix = {
      criteria: ['alpha_rate', 'lateness_severity', 'lateness_frequency', 'work_focus'],
      comparisons: [
        ['alpha_rate', 'lateness_severity', 1.5], // Alpha rate > Lateness severity
        ['alpha_rate', 'lateness_frequency', 2], // Alpha rate > Lateness frequency
        ['alpha_rate', 'work_focus', 2.5], // Alpha rate > Work focus
        ['lateness_severity', 'lateness_frequency', 1.3], // Severity > Frequency
        ['lateness_severity', 'work_focus', 1.7], // Severity > Work focus
        ['lateness_frequency', 'work_focus', 1.3] // Frequency > Work focus
      ],
      defaultWeights: [0.35, 0.25, 0.2, 0.2] // Fallback weights
    };

    // Calculate AHP weights
    const weights = _calculateAhpWeights(disciplineMatrix);

    // Extract and validate metrics
    const alphaRate = userMetrics.alpha_rate || 0; // Percentage of alpha days
    const latenessSeverity = userMetrics.avg_lateness_minutes || 0; // Average minutes late
    const latenessFrequency = userMetrics.lateness_frequency || 0; // Percentage of late days
    const workFocus = userMetrics.work_hour_consistency || 75; // Work hour consistency score

    logger.info('Discipline calculation inputs:', {
      alphaRate,
      latenessSeverity,
      latenessFrequency,
      workFocus
    });

    // FUZZY LOGIC INFERENCE
    const { inputSets } = disciplineFuzzyLogic;

    // 1. FUZZIFICATION - Convert crisp inputs to fuzzy memberships
    const alphaMembership = fuzzifyInput(alphaRate, inputSets.alpha_rate);
    const severityMembership = fuzzifyInput(latenessSeverity, inputSets.lateness_severity);
    const frequencyMembership = fuzzifyInput(latenessFrequency, inputSets.lateness_frequency);
    const focusMembership = fuzzifyInput(workFocus, inputSets.work_focus);

    logger.info('Discipline fuzzy memberships:', {
      alpha: alphaMembership,
      severity: severityMembership,
      frequency: frequencyMembership,
      focus: focusMembership
    });

    // 2. RULE APPLICATION - Apply fuzzy rules
    const fuzzyInputs = {
      alpha_rate: alphaMembership,
      lateness_severity: severityMembership,
      lateness_frequency: frequencyMembership,
      work_focus: focusMembership
    };

    const outputMembership = applyDisciplineFuzzyRules(fuzzyInputs);
    logger.info('Discipline output memberships:', outputMembership);

    // 3. DEFUZZIFICATION - Convert fuzzy output to crisp score
    const fuzzyScore = defuzzifyDisciplineOutput(outputMembership);

    // 4. AHP WEIGHTED CALCULATION
    // Calculate component scores for AHP (inverted for positive scoring)
    const alphaScore = Math.max(0, 100 - alphaRate * 2); // Lower alpha rate = higher score
    const severityScore = Math.max(0, 100 - latenessSeverity * 2); // Lower lateness = higher score
    const frequencyScore = Math.max(0, 100 - latenessFrequency); // Lower frequency = higher score
    const focusScore = workFocus; // Direct score

    const ahpScore =
      alphaScore * weights.alpha_rate +
      severityScore * weights.lateness_severity +
      frequencyScore * weights.lateness_frequency +
      focusScore * weights.work_focus;

    // 5. HYBRID APPROACH - Combine fuzzy logic with AHP
    const finalScore = Math.min(100, Math.max(0, fuzzyScore * 0.6 + ahpScore * 0.4));

    const label = getDisciplineLabel(finalScore);

    logger.info(
      `📊 DISCIPLINE INDEX: ${finalScore.toFixed(1)} (${label}) - Fuzzy: ${fuzzyScore.toFixed(1)}, AHP: ${ahpScore.toFixed(1)}`
    );

    return {
      score: Math.round(finalScore * 100) / 100,
      label,
      breakdown: {
        alpha_rate: alphaRate,
        lateness_severity: latenessSeverity,
        lateness_frequency: latenessFrequency,
        work_focus: workFocus,
        fuzzy_score: Math.round(fuzzyScore * 100) / 100,
        ahp_score: Math.round(ahpScore * 100) / 100,
        weights_used: weights,
        fuzzy_memberships: {
          alpha: alphaMembership,
          severity: severityMembership,
          frequency: frequencyMembership,
          focus: focusMembership
        },
        output_memberships: outputMembership
      }
    };
  } catch (error) {
    logger.error('Error calculating discipline index:', error);
    return {
      score: 50,
      label: 'Cukup Disiplin',
      breakdown: { error: error.message }
    };
  }
}

/**
 * Backward compatibility functions
 */
function getDisciplineAhpWeights() {
  return { lateness: 0.35, absenteeism: 0.25, overtime: 0.15, consistency: 0.25 };
}

/**
 * Calculate AHP weights for checkout prediction criteria
 * Priority: Historical Pattern (40%) > Checkin Time (25%) > Day Context (20%) > Transition Factor (15%)
 */
function getCheckoutPredictionAhpWeights() {
  try {
    const ahp = new AHP();
    const criteria = ['historical_pattern', 'checkin_time', 'day_context', 'transition_factor'];

    // AHP comparison matrix for checkout prediction weights
    const comparisonMatrix = [
      ['historical_pattern', 'checkin_time', 1.6], // 40% vs 25% ≈ 1.6:1
      ['historical_pattern', 'day_context', 2], // 40% vs 20% = 2:1
      ['historical_pattern', 'transition_factor', 2.67], // 40% vs 15% ≈ 2.67:1
      ['checkin_time', 'day_context', 1.25], // 25% vs 20% = 1.25:1
      ['checkin_time', 'transition_factor', 1.67], // 25% vs 15% ≈ 1.67:1
      ['day_context', 'transition_factor', 1.33] // 20% vs 15% ≈ 1.33:1
    ];

    ahp.addCriteria(criteria);
    ahp.addItems(['dummy']);
    ahp.rankCriteria(comparisonMatrix);

    criteria.forEach((criterion) => {
      ahp.rankCriteriaItem(criterion, [['dummy', 'dummy', 1]]);
    });

    const result = ahp.run();
    const weights = result.criteriaRankMetaMap.weightedVector;

    logger.info('Checkout Prediction AHP Weights:', {
      historical_pattern: weights[0],
      checkin_time: weights[1],
      day_context: weights[2],
      transition_factor: weights[3]
    });

    return {
      historical_pattern: weights[0],
      checkin_time: weights[1],
      day_context: weights[2],
      transition_factor: weights[3]
    };
  } catch (error) {
    logger.error('AHP calculation failed for checkout prediction:', error);
    return {
      historical_pattern: 0.4,
      checkin_time: 0.25,
      day_context: 0.2,
      transition_factor: 0.15
    };
  }
}

/**
 * Initialize Checkout Prediction Fuzzy Logic System
 */
function createCheckoutFuzzySystem() {
  // Checkin Time fuzzy sets (hours in 24-hour format)
  const checkinTimeFS = {
    pagi: new fuzzylogic.Triangle(6, 8, 10), // Early morning
    siang: new fuzzylogic.Triangle(9, 11, 13), // Mid morning to noon
    sore: new fuzzylogic.Triangle(12, 14, 16) // Afternoon
  };

  // Historical Hours fuzzy sets (average work duration)
  const historicalHoursFS = {
    pendek: new fuzzylogic.Triangle(4, 6, 7), // Short workdays
    normal: new fuzzylogic.Triangle(6.5, 8, 9.5), // Normal workdays
    panjang: new fuzzylogic.Triangle(9, 10, 12) // Long workdays
  };

  // Transition Count fuzzy sets (mobility during day)
  const transitionCountFS = {
    rendah: new fuzzylogic.Triangle(0, 1, 3), // Low mobility
    sedang: new fuzzylogic.Triangle(2, 4, 6), // Medium mobility
    tinggi: new fuzzylogic.Grade(5, 10) // High mobility
  };

  // Day of Week fuzzy sets
  const dayOfWeekFS = {
    awal_minggu: new fuzzylogic.Triangle(1, 2, 3), // Monday-Tuesday
    tengah_minggu: new fuzzylogic.Triangle(2, 3, 4), // Tuesday-Wednesday
    akhir_minggu: new fuzzylogic.Triangle(4, 5, 6) // Thursday-Friday
  };

  // Output duration fuzzy sets (predicted work hours)
  const durationFS = {
    pendek: new fuzzylogic.Triangle(4, 6, 7),
    normal: new fuzzylogic.Triangle(6.5, 8, 9.5),
    panjang: new fuzzylogic.Triangle(9, 10, 12)
  };

  return {
    inputSets: {
      checkin_time: checkinTimeFS,
      historical_hours: historicalHoursFS,
      transition_count: transitionCountFS,
      day_of_week: dayOfWeekFS
    },
    outputSets: {
      duration: durationFS
    }
  };
}

// Initialize checkout fuzzy system globally
const checkoutFuzzyLogic = createCheckoutFuzzySystem();

/**
 * Apply fuzzy rules for checkout prediction
 */
function applyCheckoutFuzzyRules(inputs) {
  const {
    checkin_time: checkinMembership,
    historical_hours: histMembership,
    transition_count: transMembership,
    day_of_week: dayMembership
  } = inputs;

  let outputMembership = {
    pendek: 0,
    normal: 0,
    panjang: 0
  };

  // Core Rules: Historical pattern is primary predictor
  // Rule 1: IF historical_hours=panjang THEN duration=panjang
  const rule1 = histMembership.panjang || 0;
  outputMembership.panjang = Math.max(outputMembership.panjang, rule1);

  // Rule 2: IF historical_hours=normal THEN duration=normal
  const rule2 = histMembership.normal || 0;
  outputMembership.normal = Math.max(outputMembership.normal, rule2);

  // Rule 3: IF historical_hours=pendek THEN duration=pendek
  const rule3 = histMembership.pendek || 0;
  outputMembership.pendek = Math.max(outputMembership.pendek, rule3);

  // Checkin Time Adjustment Rules
  // Rule 4: IF checkin_time=sore THEN duration=pendek (late start = shorter day)
  const rule4 = checkinMembership.sore || 0;
  outputMembership.pendek = Math.max(outputMembership.pendek, rule4);

  // Rule 5: IF checkin_time=pagi AND historical_hours=normal THEN duration=panjang
  const rule5 = Math.min(checkinMembership.pagi || 0, histMembership.normal || 0);
  outputMembership.panjang = Math.max(outputMembership.panjang, rule5);

  // Day Context Rules
  // Rule 6: IF day=akhir_minggu THEN duration=pendek (Friday effect)
  const rule6 = dayMembership.akhir_minggu || 0;
  outputMembership.pendek = Math.max(outputMembership.pendek, rule6 * 0.7);

  // Rule 7: IF day=tengah_minggu AND historical_hours=normal THEN duration=normal
  const rule7 = Math.min(dayMembership.tengah_minggu || 0, histMembership.normal || 0);
  outputMembership.normal = Math.max(outputMembership.normal, rule7);

  // Transition/Mobility Rules
  // Rule 8: IF transition_count=tinggi THEN duration=normal (high mobility = normal workday)
  const rule8 = transMembership.tinggi || 0;
  outputMembership.normal = Math.max(outputMembership.normal, rule8 * 0.6);

  // Rule 9: IF transition_count=rendah AND historical_hours=panjang THEN duration=panjang
  const rule9 = Math.min(transMembership.rendah || 0, histMembership.panjang || 0);
  outputMembership.panjang = Math.max(outputMembership.panjang, rule9);

  // Rule 10: IF checkin_time=siang AND transition_count=sedang THEN duration=normal
  const rule10 = Math.min(checkinMembership.siang || 0, transMembership.sedang || 0);
  outputMembership.normal = Math.max(outputMembership.normal, rule10);

  return outputMembership;
}

/**
 * Defuzzify checkout prediction output
 */
function defuzzifyCheckoutOutput(outputMembership) {
  let numerator = 0;
  let denominator = 0;

  // Predefined centroids for duration fuzzy sets
  const centroids = {
    pendek: 6, // Center of (4, 6, 7)
    normal: 8, // Center of (6.5, 8, 9.5)
    panjang: 10 // Center of (9, 10, 12)
  };

  Object.entries(outputMembership).forEach(([label, membership]) => {
    if (membership > 0 && centroids[label]) {
      numerator += membership * centroids[label];
      denominator += membership;
    }
  });

  return denominator > 0 ? numerator / denominator : 8; // Default 8 hours
}

/**
 * Smart Checkout Time Prediction using Fuzzy AHP
 * Enhanced implementation with proper fuzzy logic inference
 */
async function predictCheckoutTime(dailyContext, ahpWeights = null) {
  try {
    const weights = ahpWeights || getCheckoutPredictionAhpWeights();

    // Extract and validate input parameters
    const checkinTime = dailyContext.checkinTime || 8; // Hour of checkin
    const historicalHours = dailyContext.historicalHours || 8.0; // Average historical work hours
    const transitionCount = dailyContext.transitionCount || 0; // Location transitions today
    const dayOfWeek = dailyContext.dayOfWeek || 1; // Day of week (1=Monday)

    logger.info('Checkout prediction inputs:', {
      checkinTime,
      historicalHours,
      transitionCount,
      dayOfWeek
    });

    // FUZZY LOGIC INFERENCE
    const { inputSets } = checkoutFuzzyLogic;

    // 1. FUZZIFICATION - Convert crisp inputs to fuzzy memberships
    const checkinMembership = fuzzifyInput(checkinTime, inputSets.checkin_time);
    const historicalMembership = fuzzifyInput(historicalHours, inputSets.historical_hours);
    const transitionMembership = fuzzifyInput(transitionCount, inputSets.transition_count);
    const dayMembership = fuzzifyInput(dayOfWeek, inputSets.day_of_week);

    logger.info('Fuzzy memberships:', {
      checkin: checkinMembership,
      historical: historicalMembership,
      transition: transitionMembership,
      day: dayMembership
    });

    // 2. RULE APPLICATION - Apply fuzzy rules
    const fuzzyInputs = {
      checkin_time: checkinMembership,
      historical_hours: historicalMembership,
      transition_count: transitionMembership,
      day_of_week: dayMembership
    };

    const outputMembership = applyCheckoutFuzzyRules(fuzzyInputs);
    logger.info('Output memberships:', outputMembership);

    // 3. DEFUZZIFICATION - Convert fuzzy output to crisp duration
    const fuzzyDuration = defuzzifyCheckoutOutput(outputMembership);

    // 4. AHP WEIGHTED ADJUSTMENT
    // Calculate component scores for AHP
    const historicalScore = Math.min(Math.max(historicalHours, 4), 12); // Normalize to 4-12 range
    const checkinScore = checkinTime < 8 ? 9 : checkinTime > 10 ? 7 : 8; // Early=9, Normal=8, Late=7
    const dayScore = dayOfWeek === 5 ? 7 : dayOfWeek === 1 ? 8.5 : 8; // Friday=7, Monday=8.5, Other=8
    const transitionScore = transitionCount > 5 ? 7.5 : transitionCount < 2 ? 8.5 : 8; // High=7.5, Low=8.5, Medium=8

    const ahpScore =
      historicalScore * weights.historical_pattern +
      checkinScore * weights.checkin_time +
      dayScore * weights.day_context +
      transitionScore * weights.transition_factor;

    // 5. HYBRID APPROACH - Combine fuzzy logic with AHP
    const finalDuration = fuzzyDuration * 0.7 + ahpScore * 0.3;

    // 6. Apply constraints and validations
    const predictedDuration = Math.min(Math.max(finalDuration, 4), 12); // Constrain to 4-12 hours

    logger.info(
      `🕐 CHECKOUT PREDICTION: ${predictedDuration.toFixed(2)}h (Fuzzy: ${fuzzyDuration.toFixed(2)}h, AHP: ${ahpScore.toFixed(2)}h)`
    );

    return predictedDuration;
  } catch (error) {
    logger.error('Error in smart checkout prediction:', error);
    // Fallback to simple historical average with slight adjustment
    const baseDuration = dailyContext.historicalHours || 8.0;
    const checkinAdjustment =
      dailyContext.checkinTime > 9 ? -1.0 : dailyContext.checkinTime < 7 ? 0.5 : 0;
    return Math.max(4, Math.min(12, baseDuration + checkinAdjustment));
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// ==========================================
// LOCATION SCORING FUNCTIONS
// ==========================================

/**
 * Calculate location type score with UPDATED categories
 * NEW: Cafe=100, Library=85, Hotel=75, Restaurant=65, Mall=60, Park=45, Other=40
 * REMOVED: Coworking (no longer available as separate category)
 */
function calculateLocationTypeScore(placeDetails) {
  const categories = placeDetails.properties?.categories || [];
  const placeName = (placeDetails.properties?.name || '').toLowerCase();

  // NEW SCORING SYSTEM - Cafe is now highest
  if (
    categories.some((cat) => cat.includes('cafe') || cat.includes('coffee')) ||
    placeName.includes('cafe') ||
    placeName.includes('coffee')
  ) {
    return 100; // Cafe = highest score
  }

  if (
    categories.some((cat) => cat.includes('library')) ||
    placeName.includes('library') ||
    placeName.includes('perpustakaan')
  ) {
    return 85; // Library
  }

  if (
    categories.some((cat) => cat.includes('hotel') || cat.includes('accommodation')) ||
    placeName.includes('hotel')
  ) {
    return 75; // Hotel
  }

  if (
    categories.some((cat) => cat.includes('restaurant') || cat.includes('food')) ||
    placeName.includes('restaurant') ||
    placeName.includes('restoran')
  ) {
    return 65; // Restaurant
  }

  if (
    categories.some((cat) => cat.includes('mall') || cat.includes('shopping')) ||
    placeName.includes('mall') ||
    placeName.includes('plaza')
  ) {
    return 60; // Mall
  }

  if (
    categories.some((cat) => cat.includes('park') || cat.includes('leisure')) ||
    placeName.includes('park') ||
    placeName.includes('taman')
  ) {
    return 45; // Park
  }

  return 40; // Other (everything else)
}

/**
 * Simplified amenity assessment - KEY POINTS ONLY
 */
function calculateAmenityScore(placeDetails) {
  const properties = placeDetails.properties || {};
  const facilities = properties.facilities || {};
  const paymentOptions = properties.payment_options || {};

  let score = 50; // Base score
  const keyPoints = [];

  // Internet access (+20 points max)
  const internetAssessment = assessInternetAccess(facilities, {}, []);
  score += (internetAssessment.score || 0) * 0.2;
  if (internetAssessment.score > 70) keyPoints.push('Good internet access');

  // Physical comfort (+15 points max)
  const physicalAssessment = assessPhysicalComfort(facilities, {}, []);
  score += (physicalAssessment.score || 0) * 0.15;
  if (physicalAssessment.score > 70) keyPoints.push('Comfortable seating');

  // Payment options (+15 points max)
  const paymentAssessment = assessPaymentOptionsCorrect(paymentOptions, {});
  score += (paymentAssessment.score || 0) * 0.15;
  if (paymentAssessment.score > 70) keyPoints.push('Multiple payment options');

  // Basic facilities check
  if (facilities.air_conditioning) keyPoints.push('Air conditioning');
  if (facilities.quiet) keyPoints.push('Quiet environment');

  return {
    score: Math.min(100, Math.max(0, score)),
    key_points: keyPoints.length > 0 ? keyPoints : ['Basic amenities available']
  };
}

/**
 * Distance score calculation (unchanged)
 */
function calculateDistanceScore(placeDetails) {
  let distance = placeDetails.properties?.distance || 1000;

  if (distance <= 200) return 100;
  if (distance <= 500) return 90;
  if (distance <= 1000) return 80;
  if (distance <= 2000) return 70;
  if (distance <= 5000) return 60;
  if (distance <= 10000) return 50;
  return 30;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Convert WFA score to qualitative label
 */
function getWfaScoreLabel(score) {
  if (score >= 85) return 'Sangat Direkomendasikan';
  if (score >= 70) return 'Direkomendasikan';
  if (score >= 55) return 'Cukup Direkomendasikan';
  if (score >= 40) return 'Kurang Direkomendasikan';
  return 'Tidak Direkomendasikan';
}

/**
 * Convert discipline score to qualitative label (for backward compatibility)
 */
function getDisciplineLabel(score) {
  if (score >= 85) return 'Sangat Disiplin';
  if (score >= 70) return 'Disiplin';
  if (score >= 55) return 'Cukup Disiplin';
  if (score >= 40) return 'Kurang Disiplin';
  return 'Tidak Disiplin';
}

/**
 * Categorize place into user-friendly categories
 */
function categorizePlace(place) {
  const categories = place.properties?.categories || [];
  const name = (place.properties?.name || '').toLowerCase();

  if (
    categories.some((cat) => cat.includes('cafe') || cat.includes('coffee')) ||
    name.includes('cafe') ||
    name.includes('coffee')
  ) {
    return 'cafe';
  }

  if (
    categories.some((cat) => cat.includes('library')) ||
    name.includes('library') ||
    name.includes('perpustakaan')
  ) {
    return 'library';
  }

  if (
    categories.some((cat) => cat.includes('hotel') || cat.includes('accommodation')) ||
    name.includes('hotel')
  ) {
    return 'hotel';
  }

  if (
    categories.some((cat) => cat.includes('restaurant') || cat.includes('food')) ||
    name.includes('restaurant') ||
    name.includes('restoran')
  ) {
    return 'restaurant';
  }

  return 'other';
}

/**
 * Get category display name in Indonesian
 */
function getCategoryDisplayName(category) {
  const categoryMap = {
    cafe: 'Cafe',
    library: 'Perpustakaan',
    hotel: 'Hotel',
    restaurant: 'Restaurant',
    other: 'Lainnya'
  };
  return categoryMap[category] || 'Tidak Diketahui';
}

// ==========================================
// EXPORT MAIN FUNCTIONS
// ==========================================

export default {
  // Main WFA functions
  calculateWfaScore,
  calculateDisciplineIndex,
  predictCheckoutTime,

  // AHP weight functions
  getWfaAhpWeights,
  getDisciplineAhpWeights,
  getCheckoutPredictionAhpWeights,

  // Utility functions
  getWfaScoreLabel,
  getDisciplineLabel,
  categorizePlace,
  getCategoryDisplayName,

  // Component scoring functions
  calculateLocationTypeScore,
  calculateAmenityScore,
  calculateDistanceScore
};
