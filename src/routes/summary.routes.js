import express from 'express';

import summaryController from '../controllers/summary.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';

const router = express.Router();

router.get(
  '/',
  verifyToken,
  roleGuard(['Admin', 'Management']),
  summaryController.getSummaryReport
);

export default router;
