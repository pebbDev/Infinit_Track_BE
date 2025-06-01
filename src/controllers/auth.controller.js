import fs from 'fs';

import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import config from '../config/index.js';
import { User, Photo, Role } from '../models/index.js';
import sequelize from '../config/database.js';
import Location from '../models/location.js';
import logger from '../utils/logger.js';

export const login = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Login failed - Validation errors: ${JSON.stringify(errors.array())}`);
      return res.status(400).json({
        success: false,
        code: 'E_LOGIN',
        message: errors.array()[0].msg
      });
    }

    const { email, password } = req.body;
    const userAgent = req.get('User-Agent') || '';
    const isMobile =
      userAgent.includes('Mobile') || req.headers.authorization?.startsWith('Bearer '); // Find user by email (case insensitive)
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id_roles', 'role_name']
        }
      ]
    });

    if (!user) {
      logger.warn(`Login failed - Email not found: ${email}`);
      return res.status(400).json({
        success: false,
        code: 'E_LOGIN',
        message: 'Email tidak terdaftar'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed - Wrong password for: ${email}`);
      return res.status(400).json({
        success: false,
        code: 'E_LOGIN',
        message: 'Password salah'
      });
    }

    let userPhoto = null;
    if (user.id_photos) {
      userPhoto = await Photo.findByPk(user.id_photos);
    }

    // Check if existing token needs refresh (sliding window)
    let token;
    let shouldRefresh = false;

    if (req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, config.jwt.secret);
        const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);

        // If less than 1 hour remaining, refresh token
        if (timeToExpiry < 3600) {
          shouldRefresh = true;
        } else {
          token = req.cookies.token;
        }
      } catch (error) {
        shouldRefresh = true;
      }
    } else {
      shouldRefresh = true;
    }
    const responseData = {
      id: user.id_users,
      full_name: user.full_name,
      role: {
        id: user.role?.id_roles || null,
        name: user.role?.role_name || null
      },
      photo: userPhoto?.file_path || null,
      photo_updated_at: userPhoto?.photo_updated_at || null
    };

    if (shouldRefresh || !token) {
      const payload = {
        id: user.id_users,
        email: user.email,
        full_name: user.full_name,
        role: {
          id: user.role?.id_roles || null,
          name: user.role?.role_name || null
        },
        photo: userPhoto?.file_path || null,
        photo_updated_at: userPhoto?.photo_updated_at || null
      };

      token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.ttl
      });

      // Set cookie for web clients
      if (!isMobile) {
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: config.jwt.ttl * 1000
        });
      }

      logger.info(`Login successful for user: ${email}`);
    }

    // Add token to response for mobile clients
    if (isMobile) {
      responseData.token = token;
    }
    res.json({
      success: true,
      data: responseData,
      message: 'Login berhasil'
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      code: 'E_LOGIN',
      message: 'Terjadi kesalahan pada server'
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

export const register = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      email,
      password,
      id_roles,
      id_position,
      full_name,
      nipNim,
      phoneNumber,
      id_divisions,
      id_programs,
      latitude,
      longitude,
      radius,
      description
    } = req.body;

    // Validate required fields
    if (!id_roles) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Role harus diisi'
      });
    }

    if (!id_position) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Position harus diisi'
      });
    }

    if (!id_programs) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Program harus diisi'
      });
    }

    // Cek unik email
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, code: 'E_VALIDATION', message: 'Email sudah ada' });
    }

    // Cek unik nip_nim
    const nipExists = await User.findOne({ where: { nip_nim: nipNim } });
    if (nipExists) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, code: 'E_VALIDATION', message: 'NIP/NIM sudah ada' });
    }

    // Cek file upload
    if (!req.file || !req.file.path) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        code: 'E_UPLOAD',
        message:
          'Upload gambar wajah gagal atau tidak ditemukan. Pastikan field name adalah "face_photo"'
      });
    } // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Temporarily disable foreign key checks to handle circular dependency
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

    // Create photo first
    const photo = await Photo.create(
      {
        file_path: req.file.path,
        user_id: 1, // Temporary value, will be updated after user creation
        photo_updated_at: new Date()
      },
      { transaction }
    );

    // Create user with photo reference
    const user = await User.create(
      {
        email,
        password: password_hash,
        full_name,
        nip_nim: nipNim,
        phone: phoneNumber,
        id_roles: id_roles,
        id_position: id_position,
        id_divisions: id_divisions,
        id_programs: id_programs,
        id_photos: photo.id_photos
      },
      { transaction }
    );

    // Update photo with correct user_id
    await photo.update(
      {
        user_id: user.id_users
      },
      { transaction }
    );

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });

    // Fetch user with role data for response
    const userWithRole = await User.findByPk(user.id_users, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id_roles', 'role_name']
        }
      ],
      transaction
    });

    // Buat lokasi default WFH
    const location = await Location.create(
      {
        user_id: user.id_users,
        id_attendance_categories: 2, // hardcode untuk WFH category
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius || 100,
        description: description || 'Default WFH Location'
      },
      { transaction }
    );

    // Commit transaksi
    await transaction.commit(); // Generate JWT token for the new user
    const payload = {
      id: user.id_users,
      email: user.email,
      full_name: user.full_name,
      role: {
        id: userWithRole.role?.id_roles || null,
        name: userWithRole.role?.role_name || null
      },
      photo: req.file.path
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.ttl
    });

    // Set token in cookies
    res.cookie('token', token, { httpOnly: true }); // Response sukses dengan data user dan lokasi
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userWithRole.id_users,
          full_name: userWithRole.full_name,
          role: {
            id: userWithRole.role?.id_roles || null,
            name: userWithRole.role?.role_name || null
          },
          token: token
        },
        location: {
          location_id: location.location_id,
          latitude: location.latitude,
          longitude: location.longitude,
          radius: location.radius,
          description: location.description
        }
      },
      message: 'Registrasi berhasil'
    });
  } catch (err) {
    // Rollback transaksi jika ada error
    await transaction.rollback();

    // Clean up uploaded file if exists
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          logger.info(`Cleaned up uploaded file: ${req.file.path}`);
        }
      } catch (cleanupError) {
        logger.error(`Failed to cleanup file: ${cleanupError.message}`);
      }
    }

    // Handle multer errors specifically
    if (err.code === 'UNEXPECTED_FIELD' || err.name === 'MulterError') {
      return res.status(400).json({
        success: false,
        code: 'E_UPLOAD',
        message: 'Field name untuk upload foto harus "face_photo"'
      });
    }

    logger.error(`Registration error: ${err.message}`, { stack: err.stack });
    return res.status(500).json({
      success: false,
      code: 'E_DB',
      message: err.message || 'Terjadi kesalahan pada server'
    });
  }
};
