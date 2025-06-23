import express from 'express';

import { triggerAutoCheckout } from '../jobs/autoCheckout.job.js';
import {
  getSmartCheckoutConfig,
  getPredictionWeights,
  predictWorkDuration
} from '../utils/smartCheckoutEngine.js';
import { verifyToken } from '../middlewares/authJwt.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/Admin/smart-checkout/trigger:
 *   post:
 *     summary: Manually trigger smart auto checkout (Admin only)
 *     tags: [Admin - Smart Checkout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Smart auto checkout triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 methodology:
 *                   type: string
 */
router.post('/trigger', verifyToken, async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const result = await triggerAutoCheckout();

    logger.info(`Smart auto checkout manually triggered by Admin: ${req.user.email}`);

    res.json(result);
  } catch (error) {
    logger.error('Error triggering smart auto checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger smart auto checkout',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/Admin/smart-checkout/config:
 *   get:
 *     summary: Get smart checkout engine configuration (Admin only)
 *     tags: [Admin - Smart Checkout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Smart checkout configuration retrieved successfully
 */
router.get('/config', verifyToken, async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const config = getSmartCheckoutConfig();

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error getting smart checkout config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get smart checkout configuration',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/Admin/smart-checkout/weights:
 *   get:
 *     summary: Get AHP criteria weights for smart checkout (Admin only)
 *     tags: [Admin - Smart Checkout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AHP weights retrieved successfully
 */
router.get('/weights', verifyToken, async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const weights = getPredictionWeights();

    res.json({
      success: true,
      data: weights
    });
  } catch (error) {
    logger.error('Error getting prediction weights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get prediction weights',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/Admin/smart-checkout/predict:
 *   post:
 *     summary: Test work duration prediction (Admin only)
 *     tags: [Admin - Smart Checkout]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkinTime
 *               - historicalHours
 *               - dayOfWeek
 *               - transitionCount
 *             properties:
 *               checkinTime:
 *                 type: number
 *                 description: Check-in time in hours (24-hour format, e.g., 8.5 for 08:30)
 *                 example: 8.5
 *               historicalHours:
 *                 type: number
 *                 description: Average historical work hours
 *                 example: 8.2
 *               dayOfWeek:
 *                 type: integer
 *                 description: Day of week (0=Sunday, 6=Saturday)
 *                 example: 1
 *               transitionCount:
 *                 type: integer
 *                 description: Number of location transitions
 *                 example: 5
 *     responses:
 *       200:
 *         description: Work duration prediction calculated successfully
 */
router.post('/predict', verifyToken, async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { checkinTime, historicalHours, dayOfWeek, transitionCount } = req.body;

    // Validation
    if (typeof checkinTime !== 'number' || checkinTime < 0 || checkinTime > 24) {
      return res.status(400).json({
        success: false,
        message: 'checkinTime must be a number between 0 and 24'
      });
    }

    if (typeof historicalHours !== 'number' || historicalHours < 0) {
      return res.status(400).json({
        success: false,
        message: 'historicalHours must be a positive number'
      });
    }

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        message: 'dayOfWeek must be an integer between 0 and 6'
      });
    }

    if (!Number.isInteger(transitionCount) || transitionCount < 0) {
      return res.status(400).json({
        success: false,
        message: 'transitionCount must be a non-negative integer'
      });
    }

    const prediction = await predictWorkDuration({
      checkinTime,
      historicalHours,
      dayOfWeek,
      transitionCount
    });

    logger.info(`Smart checkout prediction test by Admin: ${req.user.email}`, {
      params: { checkinTime, historicalHours, dayOfWeek, transitionCount },
      prediction
    });

    res.json({
      success: true,
      data: {
        input: { checkinTime, historicalHours, dayOfWeek, transitionCount },
        prediction
      }
    });
  } catch (error) {
    logger.error('Error testing work duration prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate work duration prediction',
      error: error.message
    });
  }
});

export default router;
