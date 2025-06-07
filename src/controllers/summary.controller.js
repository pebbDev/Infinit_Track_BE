import { Op } from 'sequelize';

import sequelize from '../config/database.js';
import {
  Attendance,
  User,
  Role,
  Location,
  AttendanceCategory,
  AttendanceStatus
} from '../models/index.js';
import logger from '../utils/logger.js';
import { formatWorkHour } from '../utils/workHourFormatter.js';

/**
 /**
 * Get summary report for admin and management
 * Provides aggregated summary data (counts by status & category) 
 * AND detailed attendance report with time filters and pagination
 * @route GET /api/summary
 * @access Admin, Management
 */
export const getSummaryReport = async (req, res, next) => {
  try {
    const { period = 'daily', page = 1, limit = 10 } = req.query;

    // Validasi parameter period
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
        break;
      case 'weekly': {
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
      }
      case 'monthly':
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
    }

    // Format tanggal untuk query database (YYYY-MM-DD)
    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null;
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : null;

    logger.info(
      `Generating summary report - Period: ${period}, Range: ${startDateStr || 'unlimited'} to ${endDateStr || 'unlimited'}`
    );

    // Buat where condition berdasarkan period
    const whereClause = {};
    if (period !== 'all' && startDateStr && endDateStr) {
      whereClause.attendance_date = {
        [Op.between]: [startDateStr, endDateStr]
      };
    }

    // ==== QUERY UNTUK DATA SUMMARY (AGREGAT) ====

    // Query untuk summary berdasarkan status
    const statusCounts = await Attendance.findAll({
      where: whereClause,
      group: ['status_id'],
      attributes: ['status_id', [sequelize.fn('COUNT', sequelize.col('status_id')), 'total']],
      include: [
        {
          model: AttendanceStatus,
          as: 'status',
          attributes: ['attendance_status_name']
        }
      ],
      raw: false
    });

    // Query untuk summary berdasarkan kategori
    const categoryCounts = await Attendance.findAll({
      where: whereClause,
      group: ['category_id'],
      attributes: ['category_id', [sequelize.fn('COUNT', sequelize.col('category_id')), 'total']],
      include: [
        {
          model: AttendanceCategory,
          as: 'attendance_category',
          attributes: ['category_name']
        }
      ],
      raw: false
    }); // Proses hasil query menjadi objek summary dengan format yang lebih baik
    const summary = {
      total_ontime: 0,
      total_late: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0
    };

    // Proses status counts - hitung berdasarkan nama status
    statusCounts.forEach((item) => {
      const statusName = item.status?.attendance_status_name || 'unknown';
      const total = parseInt(item.dataValues.total);

      // Mapping status ke field summary
      switch (statusName.toLowerCase()) {
        case 'tepat waktu':
        case 'ontime':
          summary.total_ontime = total;
          break;
        case 'terlambat':
        case 'late':
          summary.total_late = total;
          break;
        case 'alpa':
        case 'alpha':
          summary.total_alpha = total;
          break;
        default:
          // Log status yang tidak dikenali untuk debugging
          logger.warn(`Unknown status found: ${statusName}`);
          break;
      }
    });

    // Proses category counts - hitung berdasarkan nama kategori
    categoryCounts.forEach((item) => {
      const categoryName = item.attendance_category?.category_name || 'unknown';
      const total = parseInt(item.dataValues.total);

      // Mapping kategori ke field summary
      switch (categoryName.toLowerCase()) {
        case 'wfo':
        case 'work from office':
          summary.total_wfo = total;
          break;
        case 'wfh':
        case 'work from home':
          summary.total_wfh = total;
          break;
        case 'wfa':
        case 'work from anywhere':
          summary.total_wfa = total;
          break;
        default:
          // Log kategori yang tidak dikenali untuk debugging
          logger.warn(`Unknown category found: ${categoryName}`);
          break;
      }
    });

    // ==== QUERY UNTUK LAPORAN DETAIL (DENGAN PAGINASI) ====

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const attendanceData = await Attendance.findAndCountAll({
      where: whereClause,
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
        },
        {
          model: AttendanceStatus,
          as: 'status',
          attributes: ['attendance_status_name']
        }
      ],
      order: [
        ['attendance_date', 'DESC'],
        ['time_in', 'DESC']
      ],
      limit: parseInt(limit),
      offset: offset
    });

    // ==== TRANSFORMASI DATA LAPORAN DETAIL ====

    const transformedData = attendanceData.rows.map((attendance) => {
      const user = attendance.user;
      const location = attendance.location;
      const category = attendance.attendance_category;
      const status = attendance.status;

      // Format nama lengkap dengan role
      const fullNameWithRole =
        user && user.role
          ? `${user.full_name} (${user.role.role_name})`
          : user?.full_name || 'Unknown User';

      // Kondisi khusus untuk "alpha"
      let timeIn = attendance.time_in;
      let timeOut = attendance.time_out;
      let workHour = attendance.work_hour;
      let locationDetails = null;

      if (status?.attendance_status_name === 'alpa') {
        // Set data khusus untuk alpha
        timeIn = '00:00:00';
        timeOut = '00:00:00';
        workHour = 0;
        locationDetails = null;
      } else {
        // Format data normal untuk status lain
        locationDetails = location
          ? {
              location_id: location.location_id,
              description: location.description,
              category:
                location.attendance_category?.category_name || category?.category_name || 'Unknown',
              coordinates: {
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude)
              }
            }
          : {
              location_id: null,
              description: 'Location not specified',
              category: category?.category_name || 'Unknown',
              coordinates: null
            };
      }

      // Status informasi
      const information =
        timeOut && timeOut !== '00:00:00'
          ? `Work Duration: ${formatWorkHour(workHour)}`
          : 'Currently checked in';

      return {
        attendance_id: attendance.id_attendance,
        user_id: user?.id_users || null,
        full_name: fullNameWithRole,
        nip_nim: user?.nip_nim || null,
        email: user?.email || null,
        time_in: timeIn,
        time_out: timeOut,
        work_hour: formatWorkHour(workHour),
        attendance_date: attendance.attendance_date,
        location_details: locationDetails,
        status: status?.attendance_status_name || 'unknown',
        information: information,
        notes: attendance.notes || ''
      };
    });

    // ==== PAGINATION INFO ====

    const pagination = {
      current_page: parseInt(page),
      total_pages: Math.ceil(attendanceData.count / parseInt(limit)),
      total_items: attendanceData.count,
      items_per_page: parseInt(limit),
      has_next_page: parseInt(page) < Math.ceil(attendanceData.count / parseInt(limit)),
      has_prev_page: parseInt(page) > 1
    };

    logger.info(
      `Summary report generated successfully - ${attendanceData.count} detail records found`
    );

    // ==== BENTUK DAN KIRIM RESPONS AKHIR (HTTP 200 OK) ====

    res.status(200).json({
      success: true,
      summary: summary,
      report: {
        data: transformedData,
        pagination: pagination
      },
      period: period,
      date_range:
        period === 'all'
          ? {
              start_date: 'unlimited',
              end_date: 'unlimited'
            }
          : {
              start_date: startDateStr,
              end_date: endDateStr
            },
      message: 'Summary and report fetched successfully'
    });
  } catch (error) {
    logger.error(`Error generating summary report: ${error.message}`, {
      stack: error.stack,
      query: req.query
    });
    next(error);
  }
};

export default {
  getSummaryReport
};
