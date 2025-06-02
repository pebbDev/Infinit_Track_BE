import express from 'express';
import multer from 'multer';

import {
  getAllUsers,
  uploadUserPhoto,
  updateUser,
  deleteUser
} from '../controllers/user.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/authJwt.js';
import roleGuard from '../middlewares/roleGuard.js';
import { validateUpdateUser, validate } from '../middlewares/validator.js';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG and PNG files are allowed'), false);
    }
  }
});

// GET /users - Get all users with full profile details (admin and management only)
router.get('/', verifyToken, roleGuard(['Admin', 'Management']), getAllUsers);

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
