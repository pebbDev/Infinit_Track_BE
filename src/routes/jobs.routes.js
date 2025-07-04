import express from 'express';

import {
  triggerGeneralAlpha,
  triggerWfaBookings,
  triggerSmartAutoCheckout,
  triggerAllJobs,
  getJobsStatus
} from '../controllers/jobs.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';

const router = express.Router();

/**
 * Job Management Routes
 * All routes require authentication and Admin role
 */

// Get status of all cron jobs
router.get('/status', verifyToken, roleGuard(['Admin']), getJobsStatus);

// Manual trigger endpoints
router.post('/trigger/general-alpha', verifyToken, roleGuard(['Admin']), triggerGeneralAlpha);
router.post('/trigger/wfa-bookings', verifyToken, roleGuard(['Admin']), triggerWfaBookings);
router.post('/trigger/auto-checkout', verifyToken, roleGuard(['Admin']), triggerSmartAutoCheckout);
router.post('/trigger/all', verifyToken, roleGuard(['Admin']), triggerAllJobs);

export default router;
