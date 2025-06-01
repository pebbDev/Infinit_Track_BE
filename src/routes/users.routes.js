import express from 'express';
import multer from 'multer';

import { getAllUsers, uploadUserPhoto } from '../controllers/user.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/authJwt.js';

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

// GET /users - Sync Android (protected route)
router.get('/', verifyToken, getAllUsers);

// POST /users/:id/photo - Admin Upload Foto Wajah User (admin only)
router.post('/:id/photo', verifyToken, requireAdmin, upload.single('photo'), uploadUserPhoto);

export default router;
