import express from 'express';

import authRoutes from './auth.routes.js';
import attendanceRoutes from './attendance.routes.js';
import usersRoutes from './users.routes.js';
import referenceDataRoutes from './referenceData.routes.js';
import bookingRoutes from './booking.routes.js';
import summaryRoutes from './summary.routes.js';
import wfaRoutes from './wfa.routes.js';
import smartCheckoutRoutes from './smartCheckout.routes.js';

const router = express.Router();

// API routes
router.use('/api/auth', authRoutes);
router.use('/api/attendance', attendanceRoutes);
router.use('/api/users', usersRoutes);
router.use('/api/summary', summaryRoutes);
router.use('/api', referenceDataRoutes);
router.use('/api/bookings', bookingRoutes);
router.use('/api/wfa', wfaRoutes);
router.use('/api/admin/smart-checkout', smartCheckoutRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default router;
