import express from 'express';

import {
  getRoles,
  getPrograms,
  getPositions,
  getDivisions
} from '../controllers/referenceData.controller.js';
import { verifyToken } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';

const router = express.Router();

// GET /api/roles - Get all roles for dropdown
router.get('/roles', verifyToken, roleGuard(['Admin', 'Management']), getRoles);

// GET /api/programs - Get all programs for dropdown
router.get('/programs', verifyToken, roleGuard(['Admin', 'Management']), getPrograms);

// GET /api/positions - Get all positions for dropdown (with optional program filter)
router.get('/positions', verifyToken, roleGuard(['Admin', 'Management']), getPositions);

// GET /api/divisions - Get all divisions for dropdown
router.get('/divisions', verifyToken, roleGuard(['Admin', 'Management']), getDivisions);

export default router;
