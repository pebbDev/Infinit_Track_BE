import fs from 'fs';
import path from 'path';

import sharp from 'sharp';

import { User, Photo } from '../models/index.js';
import logger from '../utils/logger.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({ full_name: name, email });

    res.json({
      message: 'Profile updated',
      user: { id: user.id_users, full_name: user.full_name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id_users', 'full_name'],
      where: {
        deleted_at: null
      }
    });
    const response = users.map((user) => ({
      id: user.id_users,
      full_name: user.full_name
    }));

    logger.info(`Users sync requested, returned ${users.length} users`);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /users/:id/photo - Admin Upload Foto Wajah User
export const uploadUserPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File foto wajah harus diupload'
      });
    }

    // Create uploads/face directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'face');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `face-${timestamp}-${Math.floor(Math.random() * 1000000)}.jpg`;
    const filePath = path.join(uploadsDir, filename);
    const relativePath = `uploads/face/${filename}`;
    await sharp(req.file.buffer).resize(300, 300).jpeg({ quality: 80 }).toFile(filePath);

    // Create or update photo record
    let photo = await Photo.findOne({ where: { user_id: id } });

    if (photo) {
      // Update existing photo
      await photo.update({
        file_path: relativePath,
        photo_updated_at: new Date()
      });
    } else {
      // Create new photo record
      photo = await Photo.create({
        user_id: id,
        file_path: relativePath,
        photo_updated_at: new Date()
      });

      // Update user to reference this photo
      await user.update({
        id_photos: photo.id_photos
      });
    }

    logger.info(`Photo uploaded for user ${id}: ${relativePath}`);

    res.json({
      success: true,
      message: 'Foto wajah berhasil diperbarui',
      data: {
        photo_path: relativePath,
        photo_id: photo.id_photos
      }
    });
  } catch (error) {
    logger.error(`Error uploading user photo: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};
