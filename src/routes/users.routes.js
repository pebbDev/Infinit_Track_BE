import express from 'express';

import {
  createUser,
  getAllUsers,
  uploadUserPhoto,
  updateUser,
  deleteUser
} from '../controllers/user.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';
import {
  validateUpdateUser,
  validateCreateUser,
  validate,
  upload
} from '../middlewares/validator.js';

const router = express.Router();

// GET /users - Get all users with full profile details (admin and management only)
router.get('/', verifyToken, roleGuard(['Admin', 'Management']), getAllUsers);

// POST /users - Create new user (admin and management only)
router.post(
  '/',
  verifyToken,
  roleGuard(['Admin', 'Management']),
  upload.single('face_photo'),
  validateCreateUser,
  validate,
  createUser
);

// POST /users/:id/photo - Admin Upload Foto Wajah User (admin only)
router.post('/:id/photo', verifyToken, requireAdmin, upload.single('photo'), uploadUserPhoto);

// PATCH /users/:id - Update user (admin and management only)
router.patch(
  '/:id',
  verifyToken,
  roleGuard(['Admin', 'Management']),
  validateUpdateUser,
  validate,
  updateUser
);

// DELETE /users/:id - Soft delete user (admin only)
router.delete('/:id', verifyToken, roleGuard(['Admin']), deleteUser);

export default router;
