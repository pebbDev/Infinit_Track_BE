import express from 'express';

import {
  clockIn,
  clockOut as clockOutOld,
  getAttendanceHistory,
  getAttendanceStatus,
  checkIn,
  checkOut,
  debugCheckInTime,
  deleteAttendance,
  getAllAttendances,
  manualAutoCheckout,
  getAutoCheckoutSettings,
  setupAutoCheckoutConfig,
  processPastAttendances,
  manualResolveWfaBookings,
  manualCreateGeneralAlpha,
  logLocationEvent,
  getSmartCheckoutPrediction,
  getSmartEngineConfig,
  getEnhancedAutoCheckoutSettings,
  testTimezone
} from '../controllers/attendance.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';
import {
  checkInValidation,
  checkOutValidation,
  validate,
  locationEventValidation
} from '../middlewares/validator.js';

const router = express.Router();

// Timezone test endpoint (untuk debugging timezone fix) - NO AUTH untuk testing
router.get('/test-timezone', testTimezone);

// All attendance routes require authentication
router.use(verifyToken);

// Location event endpoint - for logging geofence enter/exit events
router.post('/location-event', locationEventValidation, validate, logLocationEvent);

// GET / - Get all attendances for admin/management with search and pagination
router.get('/', roleGuard(['Admin', 'Management']), getAllAttendances);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOutOld);
router.post('/check-in', checkInValidation, validate, checkIn);
router.post('/checkout/:id', checkOutValidation, validate, checkOut);
router.get('/history', getAttendanceHistory);
router.get('/status-today', getAttendanceStatus);
router.get('/debug-checkin-time', debugCheckInTime); // Debug endpoint

// Manual auto checkout endpoint (Admin only)
router.post('/manual-auto-checkout', roleGuard(['Admin', 'Management']), manualAutoCheckout);

// Setup auto checkout configuration and process past data (Admin only)
router.post('/setup-auto-checkout', roleGuard(['Admin', 'Management']), setupAutoCheckoutConfig);

// Process past attendance records only (Admin only)
router.post(
  '/process-past-attendances',
  roleGuard(['Admin', 'Management']),
  processPastAttendances
);

// Get auto checkout settings endpoint (for debugging)
router.get('/auto-checkout-settings', roleGuard(['Admin', 'Management']), getAutoCheckoutSettings);

// Manual resolve WFA bookings endpoint (Admin only)
router.post(
  '/manual-resolve-wfa-bookings',
  roleGuard(['Admin', 'Management']),
  manualResolveWfaBookings
);

// Manual create general alpha records endpoint (Admin only)
router.post(
  '/manual-create-general-alpha',
  roleGuard(['Admin', 'Management']),
  manualCreateGeneralAlpha
);

// DELETE endpoint for admin and management to delete attendance record
router.delete('/:id', verifyToken, roleGuard(['Admin', 'Management']), deleteAttendance);

// Smart checkout prediction endpoints (Admin only)
router.post('/smart-prediction', roleGuard(['Admin', 'Management']), getSmartCheckoutPrediction);
router.get('/smart-config', roleGuard(['Admin', 'Management']), getSmartEngineConfig);
router.get(
  '/enhanced-auto-checkout-settings',
  roleGuard(['Admin', 'Management']),
  getEnhancedAutoCheckoutSettings
);

// Timezone test endpoint (untuk debugging timezone fix)
router.get('/test-timezone', testTimezone);

export default router;
