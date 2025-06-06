import express from 'express';

import { getAttendanceReport } from '../controllers/report.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';

const router = express.Router();

/**
 * @route GET /api/report
 * @desc Get attendance reports (daily, weekly, monthly, all)
 * @access Admin, Management only
 * @param {string} period - Report period: 'daily', 'weekly', 'monthly', 'all' (default: 'daily')
 * @param {number} page - Page number for pagination (default: 1)
 * @param {number} limit - Items per page (default: 10)
 */
router.get('/', verifyToken, roleGuard(['Admin', 'Management']), getAttendanceReport);

export default router;
