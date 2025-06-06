import express from 'express';

import {
  clockIn,
  clockOut as clockOutOld,
  getAttendanceHistory,
  getAttendanceStatus,
  checkIn,
  checkOut,
  debugCheckInTime
} from '../controllers/attendance.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import { checkInValidation, checkOutValidation, validate } from '../middlewares/validator.js';

const router = express.Router();

// All attendance routes require authentication
router.use(verifyToken);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOutOld);
router.post('/check-in', checkInValidation, validate, checkIn);
router.post('/checkout/:id', checkOutValidation, validate, checkOut);
router.get('/history', getAttendanceHistory);
router.get('/status-today', getAttendanceStatus);
router.get('/debug-checkin-time', debugCheckInTime); // Debug endpoint

export default router;
