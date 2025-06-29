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
 * Simplified discipline calculation (backward compatibility)
 */
async function calculateDisciplineIndex(userMetrics) {
  const weights = { lateness: 0.35, absenteeism: 0.25, overtime: 0.15, consistency: 0.25 };
  const lateness = (100 - (userMetrics.lateness_rate || 0)) * weights.lateness;
  const attendance = (100 - (userMetrics.absenteeism_rate || 0)) * weights.absenteeism;
  const overtime = Math.min(100, (userMetrics.overtime_frequency || 0) * 10) * weights.overtime;
  const consistency = (userMetrics.attendance_consistency || 80) * weights.consistency;

  const score = (lateness + attendance + overtime + consistency) / 100;
  return {
    score: Math.round(score * 100) / 100,
    label: getDisciplineLabel(score),
    breakdown: { lateness, attendance, overtime, consistency }
  };
}

/**
 * Backward compatibility functions
 */
function getDisciplineAhpWeights() {
  return { lateness: 0.35, absenteeism: 0.25, overtime: 0.15, consistency: 0.25 };
}

function getCheckoutPredictionAhpWeights() {
  return { checkin_time: 0.25, historical_pattern: 0.4, day_context: 0.2, transition_factor: 0.15 };
}

/**
 * Simplified checkout prediction (backward compatibility)
 */
async function predictCheckoutTime(dailyContext) {
  const baseDuration = dailyContext.historicalHours || 8.0;
  const checkinHour = dailyContext.checkinTime || 8;

  let adjustment = 0;
  if (checkinHour < 7) adjustment = 0.5;
  if (checkinHour > 9) adjustment = -1.0;

  return Math.max(4, Math.min(12, baseDuration + adjustment));
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
