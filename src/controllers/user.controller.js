import fs from 'fs';
import path from 'path';

import sharp from 'sharp';
import { Op } from 'sequelize';

import {
  User,
  Photo,
  Role,
  Program,
  Position,
  Division,
  AttendanceCategory,
  Location
} from '../models/index.js';
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

export const getAllUsers = async (req, res, next) => {
  try {
    // Get query parameters for search and sorting
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    // Build where clause for filtering
    let whereClause = {
      deleted_at: null
    };

    // Add search functionality
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { nip_nim: { [Op.like]: `%${search}%` } }
      ];
    }

    // Query users with all required associations
    const users = await User.findAll({
      where: whereClause,
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['role_name']
        },
        {
          model: Program,
          as: 'program',
          attributes: ['program_name']
        },
        {
          model: Position,
          as: 'position',
          attributes: ['position_name']
        },
        {
          model: Division,
          as: 'division',
          attributes: ['division_name'],
          required: false
        },
        {
          model: Photo,
          as: 'photo_file',
          attributes: ['file_path', 'photo_updated_at'],
          required: false
        },
        {
          model: Location,
          as: 'wfh_location',
          where: { id_attendance_categories: 2 },
          include: [
            {
              model: AttendanceCategory,
              as: 'attendance_category',
              attributes: ['category_name']
            }
          ],
          required: true
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    // Transform data to match the response structure from /auth/me endpoint
    const transformedUsers = users.map((user) => ({
      id: user.id_users,
      full_name: user.full_name,
      email: user.email,
      role_name: user.role ? user.role.role_name : null,
      position_name: user.position ? user.position.position_name : null,
      program_name: user.program ? user.program.program_name : null,
      division_name: user.division ? user.division.division_name : null,
      nip_nim: user.nip_nim,
      phone: user.phone,
      photo: user.photo_file ? user.photo_file.file_path : null,
      photo_updated_at: user.photo_file ? user.photo_file.photo_updated_at : null,
      location: user.wfh_location
        ? {
            location_id: user.wfh_location.location_id,
            latitude: parseFloat(user.wfh_location.latitude),
            longitude: parseFloat(user.wfh_location.longitude),
            radius: parseFloat(user.wfh_location.radius),
            description: user.wfh_location.description,
            category_name: user.wfh_location.attendance_category
              ? user.wfh_location.attendance_category.category_name
              : 'Work From Home'
          }
        : null
    }));

    logger.info(`Users fetched successfully, returned ${transformedUsers.length} users`);

    res.json({
      success: true,
      data: transformedUsers,
      message: 'Users fetched successfully'
    });
  } catch (error) {
    logger.error(`Error fetching users: ${error.message}`, { stack: error.stack });
    next(error);
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
