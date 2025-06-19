import express from 'express';

import {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceStatus,
  checkIn
} from '../controllers/attendance.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import { checkInValidation, validate } from '../middlewares/validator.js';

const router = express.Router();

// All attendance routes require authentication
router.use(verifyToken);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.post('/check-in', checkInValidation, validate, checkIn);
router.get('/history', getAttendanceHistory);
router.get('/status-today', getAttendanceStatus);

export default router;
