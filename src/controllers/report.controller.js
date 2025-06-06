import { Op } from 'sequelize';

import {
  Attendance,
  User,
  Role,
  Location,
  AttendanceCategory
} from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Get attendance report for admin and management
 * @route GET /api/report
 * @access Admin, Management
 */
export const getAttendanceReport = async (req, res, next) => {
  try {
    const { period = 'daily', page = 1, limit = 10 } = req.query;    // Validasi parameter period
    const validPeriods = ['daily', 'weekly', 'monthly', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        code: 'E_VALIDATION',
        message: 'Parameter period harus berupa: daily, weekly, monthly, atau all'
      });
    }

    // Hitung rentang tanggal berdasarkan period dengan timezone Asia/Jakarta
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
    
    let startDate, endDate;

    switch (period) {
      case 'daily':
        // Hari ini saja
        startDate = new Date(localTime);
        startDate.setUTCHours(0, 0, 0, 0);
        endDate = new Date(localTime);
        endDate.setUTCHours(23, 59, 59, 999);
        break;      case 'weekly': {
        // Minggu ini (Senin - Minggu)
        const dayOfWeek = localTime.getUTCDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
        
        startDate = new Date(localTime);
        startDate.setUTCDate(localTime.getUTCDate() - daysToMonday);
        startDate.setUTCHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 6);
        endDate.setUTCHours(23, 59, 59, 999);
        break;
      }      case 'monthly':
        // Bulan ini
        startDate = new Date(localTime.getUTCFullYear(), localTime.getUTCMonth(), 1);
        endDate = new Date(localTime.getUTCFullYear(), localTime.getUTCMonth() + 1, 0);
        endDate.setUTCHours(23, 59, 59, 999);
        break;

      case 'all':
        // Semua data - tidak ada filter tanggal
        startDate = null;
        endDate = null;
        break;

      default:
        startDate = new Date(localTime);
        startDate.setUTCHours(0, 0, 0, 0);
        endDate = new Date(localTime);
        endDate.setUTCHours(23, 59, 59, 999);
    }    // Format tanggal untuk query database (YYYY-MM-DD)
    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null;
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : null;

    logger.info(`Generating attendance report - Period: ${period}, Range: ${startDateStr || 'unlimited'} to ${endDateStr || 'unlimited'}`);

    // Query attendance data dengan pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Buat where condition berdasarkan period
    const whereCondition = {};
    if (period !== 'all' && startDateStr && endDateStr) {
      whereCondition.attendance_date = {
        [Op.between]: [startDateStr, endDateStr]
      };
    }

    const attendanceData = await Attendance.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name', 'email', 'nip_nim'],
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['role_name']
            }
          ]
        },
        {
          model: Location,
          as: 'location',
          attributes: ['location_id', 'description', 'latitude', 'longitude'],
          required: false,
          include: [
            {
              model: AttendanceCategory,
              as: 'attendance_category',
              attributes: ['category_name']
            }
          ]
        },
        {
          model: AttendanceCategory,
          as: 'attendance_category',
          attributes: ['category_name']
        }
      ],
      order: [['time_in', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Transform data hasil query
    const transformedData = attendanceData.rows.map(attendance => {
      const user = attendance.user;
      const location = attendance.location;
      const category = attendance.attendance_category;

      // Format nama lengkap dengan role
      const fullNameWithRole = user && user.role 
        ? `${user.full_name} (${user.role.role_name})`
        : user?.full_name || 'Unknown User';

      // Detail lokasi
      const locationDetails = location ? {
        location_id: location.location_id,
        description: location.description,
        category: location.attendance_category?.category_name || category?.category_name || 'Unknown',
        coordinates: {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude)
        }
      } : {
        location_id: null,
        description: 'Location not specified',
        category: category?.category_name || 'Unknown',
        coordinates: null
      };

      // Status informasi
      const status = attendance.time_out ? 'Completed' : 'In Progress';
      const information = attendance.time_out 
        ? `Work Duration: ${attendance.work_hour} hours`
        : 'Currently checked in';

      return {
        attendance_id: attendance.id_attendance,
        user_id: user?.id_users || null,
        full_name: fullNameWithRole,
        nip_nim: user?.nip_nim || null,
        email: user?.email || null,
        time_in: attendance.time_in,
        time_out: attendance.time_out,
        work_hour: attendance.work_hour,
        attendance_date: attendance.attendance_date,
        location_details: locationDetails,
        status: status,
        information: information,
        notes: attendance.notes || ''
      };
    });

    // Pagination info
    const pagination = {
      current_page: parseInt(page),
      total_pages: Math.ceil(attendanceData.count / parseInt(limit)),
      total_items: attendanceData.count,
      items_per_page: parseInt(limit),
      has_next_page: parseInt(page) < Math.ceil(attendanceData.count / parseInt(limit)),
      has_prev_page: parseInt(page) > 1
    };

    logger.info(`Attendance report generated successfully - ${attendanceData.count} records found`);

    // Kirim respons sukses
    res.status(200).json({
      success: true,      data: {
        period: period,
        date_range: period === 'all' ? {
          start_date: 'unlimited',
          end_date: 'unlimited'
        } : {
          start_date: startDateStr,
          end_date: endDateStr
        },
        attendances: transformedData,
        pagination: pagination
      },
      message: `Laporan absensi ${period} berhasil diambil`
    });

  } catch (error) {
    logger.error(`Error generating attendance report: ${error.message}`, { 
      stack: error.stack,
      query: req.query 
    });
    next(error);
  }
};
