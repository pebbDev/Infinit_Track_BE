import axios from 'axios';

import Settings from '../models/settings.model.js';
import logger from '../utils/logger.js';
import { initializeEngine, scorePlaces, getAHPConfig } from '../utils/wfaRecommendationEngine.js';

/**
 * Get WFA recommendations based on user location
 * Uses Geoapify API to find nearby places and applies Unified Fuzzy AHP scoring
 */
export const getWfaRecommendations = async (req, res, next) => {
  try {
    // Langkah A: Dapatkan Input & Konfigurasi
    const { lat, lng } = req.query;

    // Validasi input
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Parameter lat dan lng wajib diisi'
      });
    }

    // Validasi format koordinat
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Format koordinat tidak valid'
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Latitude harus antara -90 dan 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Longitude harus antara -180 dan 180'
      });
    }

    // Ambil search radius dari settings
    let searchRadius = 5000; // default 5km
    try {
      const radiusSetting = await Settings.findOne({
        where: { setting_key: 'wfa.recommendation.search_radius' }
      });
      if (radiusSetting) {
        searchRadius = parseInt(radiusSetting.setting_value) || 5000;
      }
    } catch (settingError) {
      logger.warn(`Failed to fetch search radius setting: ${settingError.message}`);
    }

    // Langkah B: Panggil API Geoapify
    const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;
    if (!geoapifyApiKey) {
      logger.error('GEOAPIFY_API_KEY not found in environment variables');
      return res.status(500).json({
        success: false,
        code: 'E_CONFIG',
        message: 'API key Geoapify tidak ditemukan'
      });
    }

    // Definisikan kategori yang dicari
    const categories = 'office.coworking,education.library,catering.cafe,accommodation.hotel';

    // Parameter untuk API Geoapify
    const geoapifyParams = {
      categories,
      filter: `circle:${longitude},${latitude},${searchRadius}`,
      limit: 20,
      apiKey: geoapifyApiKey
    };
    logger.info(`Calling Geoapify API with params: ${JSON.stringify(geoapifyParams)}`);

    // Retry function for API calls
    const makeGeoapifyRequest = async (retryCount = 0) => {
      try {
        const response = await axios.get('https://api.geoapify.com/v2/places', {
          params: geoapifyParams,
          timeout: 30000, // Increase to 30 seconds
          headers: {
            'User-Agent': 'Infinit-Track-WFA/1.0',
            Accept: 'application/json'
          }
        });
        return response;
      } catch (error) {
        if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
          logger.warn(`Geoapify timeout, retrying... (attempt ${retryCount + 1})`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
          return makeGeoapifyRequest(retryCount + 1);
        }
        throw error;
      }
    };

    const geoapifyResponse = await makeGeoapifyRequest();
    const candidates = geoapifyResponse.data.features || [];

    logger.info(`Geoapify returned ${candidates.length} candidates`);

    // Langkah C: Gunakan unified Fuzzy AHP engine untuk scoring
    // Initialize engine jika belum diinisialisasi
    try {
      initializeEngine();
    } catch (error) {
      logger.warn('Engine sudah diinisialisasi:', error.message);
    }

    // Gunakan unified scoring engine
    const scoringResult = scorePlaces(candidates, latitude, longitude);
    const scoredRecommendations = scoringResult.scored_places;

    logger.info('Using Unified Fuzzy AHP approach:', {
      criteria_weights: scoringResult.methodology.criteria_weights,
      consistency_ratio: scoringResult.methodology.consistency_ratio,
      approach: scoringResult.methodology.approach,
      total_candidates: candidates.length,
      scored_candidates: scoredRecommendations.length
    });

    // Langkah D: Urutkan dan Kirim Respons
    const sortedRecommendations = scoredRecommendations.slice(0, 10); // Ambil 10 teratas

    logger.info(`Returning ${sortedRecommendations.length} recommendations`);

    res.status(200).json({
      success: true,
      data: {
        recommendations: sortedRecommendations.map((place) => ({
          name: place.properties.name || place.properties.address_line1 || 'Tempat Tidak Diketahui',
          address:
            place.properties.formatted || place.properties.address_line2 || 'Alamat tidak tersedia',
          latitude: place.geometry.coordinates[1],
          longitude: place.geometry.coordinates[0],
          suitability_score: place.scoring_details.final_score, // Already in 0-100 format from balanced scoring
          suitability_label:
            place.scoring_details.final_score >= 80
              ? 'Sangat Direkomendasikan'
              : place.scoring_details.final_score >= 60
                ? 'Baik'
                : place.scoring_details.final_score >= 40
                  ? 'Cukup'
                  : place.scoring_details.final_score >= 20
                    ? 'Kurang Sesuai'
                    : 'Tidak Direkomendasikan',
          category: place.scoring_details.evaluations.type,
          distance_from_center: place.scoring_details.distance_meters, // Already in meters
          // Detail scoring untuk debugging
          score_details: {
            final_score: place.scoring_details.final_score,
            component_scores: place.scoring_details.component_scores,
            evaluations: place.scoring_details.evaluations,
            weights_used: place.scoring_details.weights_used
          }
        })),
        search_criteria: {
          center_latitude: latitude,
          center_longitude: longitude,
          search_radius_meters: searchRadius,
          categories_searched: categories.split(','),
          total_candidates_found: candidates.length,
          recommendations_returned: sortedRecommendations.length
        },
        fuzzy_ahp_methodology: scoringResult.methodology
      },
      message: 'Rekomendasi WFA berhasil diambil menggunakan Unified Fuzzy AHP Engine'
    });
  } catch (error) {
    logger.error(`WFA recommendations error: ${error.message}`, { stack: error.stack });

    // Handle specific Axios errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        code: 'E_TIMEOUT',
        message:
          'Request timeout - Layanan Geoapify membutuhkan waktu terlalu lama untuk merespons. Silakan coba lagi.'
      });
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        code: 'E_SERVICE_UNAVAILABLE',
        message: 'Layanan Geoapify sedang tidak tersedia'
      });
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(500).json({
        success: false,
        code: 'E_API_KEY',
        message: 'API key Geoapify tidak valid atau tidak memiliki akses'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        code: 'E_RATE_LIMIT',
        message: 'Terlalu banyak permintaan ke API Geoapify, coba lagi dalam beberapa menit'
      });
    }

    if (error.response?.status >= 500) {
      return res.status(503).json({
        success: false,
        code: 'E_EXTERNAL_SERVER',
        message: 'Server Geoapify mengalami masalah internal'
      });
    }

    // Pass to error handler middleware
    next(error);
  }
};

/**
 * Get current Fuzzy AHP configuration for WFA recommendations
 * Returns the current weights and methodology information
 */
export const getWfaAhpConfig = async (req, res, next) => {
  try {
    // Initialize engine jika belum diinisialisasi
    try {
      initializeEngine();
    } catch (error) {
      logger.warn('Engine sudah diinisialisasi:', error.message);
    }

    const ahpConfig = getAHPConfig();

    res.status(200).json({
      success: true,
      data: {
        current_weights: ahpConfig.criteria_weights,
        consistency_ratio: ahpConfig.consistency_ratio,
        is_consistent: ahpConfig.consistency_ratio <= 0.1,
        method: 'Unified Fuzzy AHP Engine',
        criteria_explanation: ahpConfig.criteria_definitions,
        alternative_weights: ahpConfig.alternative_weights,
        comparison_matrix: ahpConfig.comparison_matrix,
        weight_ranges: {
          type: 'Ditentukan oleh AHP berdasarkan expert judgment',
          internet: 'Ditentukan oleh AHP berdasarkan expert judgment',
          distance: 'Ditentukan oleh AHP berdasarkan expert judgment'
        }
      },
      message: 'Konfigurasi Unified Fuzzy AHP berhasil diambil'
    });
  } catch (error) {
    logger.error(`Error getting AHP config: ${error.message}`);
    next(error);
  }
};

/**
 * Test Fuzzy AHP with different comparison values
 * Admin endpoint untuk testing dan tuning algoritma
 */
export const testFuzzyAhp = async (req, res, next) => {
  try {
    const { type_vs_internet = 3, type_vs_distance = 5, internet_vs_distance = 3 } = req.body;

    // Import class untuk testing
    const { FuzzyAHP } = await import('../utils/fuzzyAHP.js');

    const criteria = ['type', 'internet', 'distance'];
    const testAHP = new FuzzyAHP(criteria);

    // Set comparison values
    testAHP.setComparison('type', 'internet', type_vs_internet);
    testAHP.setComparison('type', 'distance', type_vs_distance);
    testAHP.setComparison('internet', 'distance', internet_vs_distance);

    const weights = testAHP.calculateWeights();
    const cr = testAHP.calculateConsistencyRatio();

    res.status(200).json({
      success: true,
      data: {
        input_comparisons: {
          type_vs_internet,
          type_vs_distance,
          internet_vs_distance
        },
        calculated_weights: weights,
        consistency_ratio: cr,
        is_consistent: cr <= 0.1,
        recommendation:
          cr <= 0.1
            ? 'Matriks perbandingan konsisten, dapat digunakan'
            : 'Matriks perbandingan tidak konsisten, pertimbangkan untuk merevisi nilai perbandingan'
      },
      message: 'Test Fuzzy AHP berhasil'
    });
  } catch (error) {
    logger.error(`Error testing Fuzzy AHP: ${error.message}`);
    next(error);
  }
};
