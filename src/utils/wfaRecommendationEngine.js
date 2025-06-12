/**
 * WFA Recommendation Engine - Unified Fuzzy AHP Implementation
 * Menggabungkan AHP library dengan Fuzzy Logic untuk sistem rekomendasi WFA
 * Filosofi: CEO (AHP) + Manajer Ahli (Fuzzy Logic)
 */

import AHP from 'ahp';
import { Triangle } from 'fuzzylogic';

import logger from './logger.js';

// ========================= FUZZY LOGIC COMPONENTS =========================

/**
 * Fuzzy sets configuration using fuzzylogic library
 */
const FUZZY_SETS = {
  // Traffic suitability - semakin rendah traffic semakin baik untuk work
  traffic: {
    low: new Triangle(0, 0, 0.4), // Excellent for work
    medium: new Triangle(0.2, 0.5, 0.8), // Acceptable for work
    high: new Triangle(0.6, 1, 1) // Less ideal for work
  },

  // Amenities quality
  amenities: {
    poor: new Triangle(0, 0, 0.4),
    good: new Triangle(0.3, 0.6, 0.9),
    excellent: new Triangle(0.7, 1, 1)
  },

  // Popularity/rating assessment
  popularity: {
    poor: new Triangle(0, 0, 0.4),
    average: new Triangle(0.2, 0.5, 0.8),
    excellent: new Triangle(0.6, 1, 1)
  }
};

/**
 * Fuzzy Linguistic Scale for AHP comparisons
 */
const FUZZY_SCALE = {
  EQUAL_IMPORTANCE: { l: 1, m: 1, u: 1 },
  WEAK_IMPORTANCE: { l: 2, m: 3, u: 4 },
  MODERATE_IMPORTANCE: { l: 4, m: 5, u: 6 },
  MODERATE_PLUS: { l: 6, m: 7, u: 8 },
  STRONG_IMPORTANCE: { l: 8, m: 9, u: 10 }
};

// ========================= AHP CONFIGURATION =========================

/**
 * WFA Criteria definitions - SIMPLIFIED & BALANCED
 */
const WFA_CRITERIA = {
  type: 'Kesesuaian jenis tempat untuk bekerja',
  internet: 'Ketersediaan akses internet/WiFi',
  distance: 'Jarak dari lokasi pengguna'
};

/**
 * Expert judgment matrix untuk perbandingan kriteria (REFACTORED - More Balanced)
 * Bobot lebih seimbang: Type (50%) > Internet (30%) > Distance (20%)
 */
const EXPERT_COMPARISON_MATRIX = [
  //        type  internet  distance
  /* type */ [1, 3, 5], // Type sangat penting vs Internet & Distance
  /* internet */ [1 / 3, 1, 3], // Internet cukup penting vs Distance
  /* distance */ [1 / 5, 1 / 3, 1] // Distance penting tapi tidak dominan
];

/**
 * Criteria alternatives configuration
 */
const CRITERIA_ALTERNATIVES = {
  type: {
    alternatives: ['cafe', 'hotel', 'library', 'coworking', 'restaurant', 'other'],
    matrix: [
      //        cafe  hotel  library  coworking  restaurant  other
      /* cafe */ [1, 2, 3, 2, 3, 7],
      /* hotel */ [1 / 2, 1, 2, 1, 2, 5],
      /* library */ [1 / 3, 1 / 2, 1, 1 / 2, 1, 4],
      /* coworking */ [1 / 2, 1, 2, 1, 2, 5],
      /* restaurant */ [1 / 3, 1 / 2, 1, 1 / 2, 1, 4],
      /* other */ [1 / 7, 1 / 5, 1 / 4, 1 / 5, 1 / 4, 1]
    ]
  },
  internet: {
    alternatives: ['confirmed_wifi', 'assumed_wifi', 'no_info'],
    matrix: [
      //                 confirmed  assumed  no_info
      /* confirmed_wifi */ [1, 5, 9],
      /* assumed_wifi */ [1 / 5, 1, 3],
      /* no_info */ [1 / 9, 1 / 3, 1]
    ]
  },
  distance: {
    alternatives: ['very_close', 'close', 'medium', 'far'],
    matrix: [
      //              very_close  close  medium  far
      /* very_close */ [1, 3, 5, 7],
      /* close */ [1 / 3, 1, 3, 5],
      /* medium */ [1 / 5, 1 / 3, 1, 3],
      /* far */ [1 / 7, 1 / 5, 1 / 3, 1]
    ]
  },
  rating: {
    alternatives: ['excellent', 'good', 'average', 'poor'],
    matrix: [
      //           excellent  good  average  poor
      /* excellent */ [1, 3, 5, 7],
      /* good */ [1 / 3, 1, 3, 5],
      /* average */ [1 / 5, 1 / 3, 1, 3],
      /* poor */ [1 / 7, 1 / 5, 1 / 3, 1]
    ]
  },
  amenities: {
    alternatives: ['high', 'medium', 'low'],
    matrix: [
      //         high  medium  low
      /* high */ [1, 3, 5],
      /* medium */ [1 / 3, 1, 3],
      /* low */ [1 / 5, 1 / 3, 1]
    ]
  }
};

// ========================= AHP INSTANCES =========================

let criteriaWeights = null;
let alternativeWeights = {};

/**
 * Setup AHP dengan criteria weights dan alternative weights terpisah
 */
const setupAHPInstances = () => {
  try {
    // Step 1: Calculate criteria weights menggunakan main criteria AHP
    const mainAHP = new AHP();
    const criteriaNames = Object.keys(WFA_CRITERIA);

    // Add dummy items untuk criteria calculation
    mainAHP.addCriteria(criteriaNames);
    mainAHP.addItems(['dummy_item']);

    // Set criteria comparisons
    const criteriaComparisons = [];
    for (let i = 0; i < criteriaNames.length; i++) {
      for (let j = i + 1; j < criteriaNames.length; j++) {
        criteriaComparisons.push([
          criteriaNames[i],
          criteriaNames[j],
          EXPERT_COMPARISON_MATRIX[i][j]
        ]);
      }
    }

    mainAHP.rankCriteria(criteriaComparisons);

    // Add dummy item comparisons untuk setiap kriteria
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

    Object.keys(CRITERIA_ALTERNATIVES).forEach((criteriaName) => {
      const config = CRITERIA_ALTERNATIVES[criteriaName];
      const criteriaAHP = new AHP();

      // Add dummy criteria untuk alternative calculation
      criteriaAHP.addCriteria(['dummy_criteria']);
      criteriaAHP.addItems(config.alternatives);

      // Set dummy criteria comparisons
      criteriaAHP.rankCriteria([['dummy_criteria', 'dummy_criteria', 1]]);

      // Set alternative comparisons
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

      // Extract alternative weights
      alternativeWeights[criteriaName] = {};
      config.alternatives.forEach((alternative) => {
        alternativeWeights[criteriaName][alternative] =
          criteriaResult.rankedScoreMap[alternative] || 0;
      });
    });

    logger.info('AHP instances berhasil diinisialisasi', {
      criteriaWeights,
      mainConsistencyRatio: mainResult.criteriaRankMetaMap.cr,
      alternativeWeights
    });
  } catch (error) {
    logger.error('Error setting up AHP instances:', error);
    throw error;
  }
};

// ========================= FUZZY SCORING FUNCTIONS =========================
// (These are kept for future enhancement but not used in balanced scoring)

// Note: Fuzzy scoring functions are available for advanced use cases
// but the balanced scoring approach uses more direct scoring methods

// ========================= DISTANCE CALCULATION =========================

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ========================= PLACE EVALUATION FUNCTIONS =========================

/**
 * Determine place type category
 */
const categorizePlace = (place) => {
  const categories = place.properties.categories || [];
  const name = place.properties.name?.toLowerCase() || '';

  // Check for coworking spaces
  if (
    categories.some((cat) => cat.includes('coworking')) ||
    name.includes('coworking') ||
    name.includes('co-working')
  ) {
    return 'coworking';
  }

  // Check for cafes
  if (categories.some((cat) => cat.includes('cafe') || cat.includes('coffee'))) {
    return 'cafe';
  }

  // Check for hotels
  if (categories.some((cat) => cat.includes('hotel') || cat.includes('accommodation'))) {
    return 'hotel';
  }

  // Check for libraries
  if (categories.some((cat) => cat.includes('library'))) {
    return 'library';
  }

  // Check for restaurants
  if (categories.some((cat) => cat.includes('restaurant') || cat.includes('food'))) {
    return 'restaurant';
  }

  return 'other';
};

/**
 * Determine internet availability
 */
const assessInternetAvailability = (place) => {
  const categories = place.properties.categories || [];
  const amenities = place.properties.amenities || {};

  // Check for confirmed WiFi
  if (
    amenities.wifi === true ||
    categories.some((cat) => cat.includes('wifi') || cat.includes('internet'))
  ) {
    return 'confirmed_wifi';
  }

  // Assume WiFi for certain place types
  const placeType = categorizePlace(place);
  if (['cafe', 'hotel', 'coworking', 'library'].includes(placeType)) {
    return 'assumed_wifi';
  }

  return 'no_info';
};

/**
 * Categorize distance
 */
const categorizeDistance = (distance) => {
  if (distance <= 0.5) return 'very_close';
  if (distance <= 2) return 'close';
  if (distance <= 5) return 'medium';
  return 'far';
};

// ========================= MAIN RECOMMENDATION ENGINE =========================

/**
 * Balanced scoring function - More realistic and forgiving approach
 */
const calculateBalancedScore = (place, userLat, userLon) => {
  // BAGIAN 1: Definisikan bobot yang lebih seimbang
  const weights = {
    type: 0.5, // 50% - Jenis tempat paling penting
    internet: 0.3, // 30% - Internet sangat dibutuhkan
    distance: 0.2 // 20% - Jarak tetap penting tapi tidak dominan
  };

  // BAGIAN 2: Hitung jarak dan informasi dasar
  const distance = calculateDistance(
    userLat,
    userLon,
    place.geometry.coordinates[1],
    place.geometry.coordinates[0]
  );
  const distanceKm = distance;
  const distanceMeters = distance * 1000;

  // BAGIAN 3: Scoring yang lebih "pemaaf" untuk setiap kriteria

  // 3.1 Type Score - Berdasarkan kesesuaian jenis tempat
  let typeScore = 30; // Skor dasar untuk tempat tidak dikenal
  const placeType = categorizePlace(place);

  switch (placeType) {
    case 'cafe':
      typeScore = 100; // Cafe sangat ideal untuk WFA
      break;
    case 'coworking':
      typeScore = 100; // Coworking space paling ideal
      break;
    case 'library':
      typeScore = 90; // Library sangat baik, sedikit kurang fleksibel
      break;
    case 'hotel':
      typeScore = 75; // Hotel cukup baik, biasanya ada lobby/area kerja
      break;
    case 'restaurant':
      typeScore = 50; // Restaurant bisa digunakan tapi kurang ideal
      break;
    default:
      typeScore = 30; // Tempat lain
  }

  // 3.2 Internet Score - Penilaian yang lebih realistis
  let internetScore = 30; // Skor dasar untuk 'Tidak Ada Info'
  const internetAvailability = assessInternetAvailability(place);

  switch (internetAvailability) {
    case 'confirmed_wifi':
      internetScore = 100; // WiFi terkonfirmasi
      break;
    case 'assumed_wifi':
      internetScore = 75; // WiFi kemungkinan besar ada (cafe, hotel, coworking)
      break;
    case 'no_info':
    default:
      // Berikan skor berdasarkan jenis tempat meskipun tidak ada info WiFi
      if (['cafe', 'hotel', 'coworking'].includes(placeType)) {
        internetScore = 60; // Asumsi positif untuk tempat yang biasanya ada WiFi
      } else if (placeType === 'library') {
        internetScore = 70; // Library biasanya ada WiFi
      } else {
        internetScore = 30; // Tempat lain, tidak ada info
      }
      break;
  }

  // 3.3 Distance Score - Normalisasi yang lebih halus
  let distanceScore = 0;
  if (distanceKm <= 0.5) {
    distanceScore = 100; // Sangat dekat
  } else if (distanceKm <= 1) {
    distanceScore = 90; // Dekat
  } else if (distanceKm <= 2) {
    distanceScore = 80; // Masih terjangkau
  } else if (distanceKm <= 5) {
    distanceScore = 60; // Agak jauh tapi masih OK
  } else if (distanceKm <= 10) {
    distanceScore = 40; // Jauh
  } else {
    distanceScore = 20; // Sangat jauh
  }

  // BAGIAN 4: Hitung skor akhir menggunakan bobot
  const rawFinalScore =
    typeScore * weights.type + internetScore * weights.internet + distanceScore * weights.distance;

  // BAGIAN 5: Pastikan skor dalam rentang 0-100 dan bulatkan ke 2 desimal
  const finalScore = Math.round(Math.min(rawFinalScore, 100) * 100) / 100;

  // BAGIAN 6: Fuzzy enhancement (opsional) - menambah realisme
  const fuzzyEnhancement = calculateFuzzyEnhancement(place);
  const enhancedScore = Math.round(Math.min(finalScore * fuzzyEnhancement, 100) * 100) / 100;

  return {
    final_score: enhancedScore,
    component_scores: {
      type_score: typeScore,
      internet_score: internetScore,
      distance_score: distanceScore,
      raw_score: rawFinalScore,
      fuzzy_enhancement: fuzzyEnhancement
    },
    evaluations: {
      type: placeType,
      internet: internetAvailability,
      distance: categorizeDistance(distanceKm)
    },
    distance: distanceKm,
    distance_meters: distanceMeters,
    weights_used: weights
  };
};

/**
 * Calculate fuzzy enhancement factor based on additional place attributes
 */
const calculateFuzzyEnhancement = (place) => {
  let enhancement = 1.0; // Base multiplier

  // Rating enhancement (jika ada data rating)
  const rating = place.properties.rating || 0;
  if (rating > 0) {
    if (rating >= 4.5)
      enhancement += 0.1; // Bonus untuk rating tinggi
    else if (rating >= 4.0) enhancement += 0.05;
    else if (rating < 3.0) enhancement -= 0.05; // Penalty untuk rating rendah
  }

  // Amenities enhancement
  const categories = place.properties.categories || [];
  const amenityCount = categories.length;
  if (amenityCount >= 5)
    enhancement += 0.05; // Banyak fasilitas
  else if (amenityCount <= 2) enhancement -= 0.05; // Sedikit fasilitas

  // Popularity enhancement (jika ada data)
  const popularity = place.properties.popularity || 0;
  if (popularity > 80)
    enhancement += 0.05; // Tempat populer
  else if (popularity > 0 && popularity < 20) enhancement -= 0.05; // Tempat sepi

  // Ensure enhancement stays within reasonable bounds (0.8 - 1.2)
  return Math.max(0.8, Math.min(1.2, enhancement));
};

// ========================= MAIN API FUNCTIONS =========================

/**
 * Initialize the recommendation engine
 */
const initializeEngine = () => {
  setupAHPInstances();
};

/**
 * Get criteria weights from AHP
 */
const getCriteriaWeights = () => {
  if (!criteriaWeights) {
    throw new Error('AHP instances not initialized');
  }

  return {
    weights: criteriaWeights,
    consistency_ratio: 'N/A' // We'll add this if needed
  };
};

/**
 * Score places using balanced scoring approach
 */
const scorePlaces = (places, userLat, userLon) => {
  try {
    const scoredPlaces = places.map((place) => {
      const scoring = calculateBalancedScore(place, userLat, userLon);

      return {
        ...place,
        wfa_score: scoring.final_score / 100, // Convert to 0-1 scale for compatibility
        scoring_details: scoring
      };
    });

    // Sort by final score descending
    scoredPlaces.sort((a, b) => b.wfa_score - a.wfa_score);

    return {
      scored_places: scoredPlaces,
      methodology: {
        approach: 'Balanced Scoring - Realistic and Forgiving Algorithm',
        weights_used: {
          type: 0.5,
          internet: 0.3,
          distance: 0.2
        },
        scoring_ranges: {
          type: '30-100 (based on place category)',
          internet: '30-100 (based on availability and place type)',
          distance: '20-100 (gradual decrease with distance)'
        }
      }
    };
  } catch (error) {
    logger.error('Error scoring places:', error);
    throw error;
  }
};

/**
 * Get AHP configuration for debugging/testing
 */
const getAHPConfig = () => {
  try {
    const weights = getCriteriaWeights();

    return {
      criteria_weights: weights.weights,
      alternative_weights: alternativeWeights,
      consistency_ratio: weights.consistency_ratio,
      criteria_definitions: WFA_CRITERIA,
      comparison_matrix: EXPERT_COMPARISON_MATRIX
    };
  } catch (error) {
    logger.error('Error getting AHP config:', error);
    throw error;
  }
};

// ========================= EXPORTS =========================

export {
  initializeEngine,
  scorePlaces,
  getCriteriaWeights,
  getAHPConfig,
  FUZZY_SCALE,
  WFA_CRITERIA,
  CRITERIA_ALTERNATIVES
};

export default {
  initializeEngine,
  scorePlaces,
  getCriteriaWeights,
  getAHPConfig
};
