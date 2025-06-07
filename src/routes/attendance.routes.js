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
  getAllAttendances
} from '../controllers/attendance.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';
import { checkInValidation, checkOutValidation, validate } from '../middlewares/validator.js';

const router = express.Router();

// All attendance routes require authentication
router.use(verifyToken);

// GET / - Get all attendances for admin/management with search and pagination
router.get('/', roleGuard(['Admin', 'Management']), getAllAttendances);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOutOld);
router.post('/check-in', checkInValidation, validate, checkIn);
router.post('/checkout/:id', checkOutValidation, validate, checkOut);
router.get('/history', getAttendanceHistory);
router.get('/status-today', getAttendanceStatus);
router.get('/debug-checkin-time', debugCheckInTime); // Debug endpoint

// DELETE endpoint for admin and management to delete attendance record
router.delete('/:id', verifyToken, roleGuard(['Admin', 'Management']), deleteAttendance);

export default router;
