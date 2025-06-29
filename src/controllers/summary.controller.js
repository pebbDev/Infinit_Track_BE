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
import { formatWorkHour, formatTimeOnly } from '../utils/workHourFormatter.js';
import fuzzyAhpEngine from '../utils/fuzzyAhpEngine.js';

/**
 * Calculate user metrics for discipline index calculation
 * @param {number} userId - User ID
 * @param {Date} startDate - Start date for calculation
 * @param {Date} endDate - End date for calculation
 * @returns {Object} User metrics object
 */
const calculateUserMetrics = async (userId, startDate, endDate) => {
  try {
    const whereClause = {
      user_id: userId
    };

    // Add date filter if provided
    if (startDate && endDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      whereClause.attendance_date = {
        [Op.between]: [startDateStr, endDateStr]
      };
    }

    // Get all attendance records for the user in the period
    const attendanceRecords = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: AttendanceStatus,
          as: 'status',
          attributes: ['attendance_status_name']
        }
      ]
    });

    if (attendanceRecords.length === 0) {
      return {
        alpha_rate: 0,
        avg_lateness_minutes: 0,
        lateness_frequency: 0,
        work_hour_consistency: 75
      };
    }

    // Calculate metrics
    const totalDays = attendanceRecords.length;
    let alphaDays = 0;
    let lateDays = 0;
    let totalLatenessMinutes = 0;
    let workHours = [];

    attendanceRecords.forEach((record) => {
      const status = record.status?.attendance_status_name || '';

      // Count alpha days
      if (status.toLowerCase() === 'alpa' || status.toLowerCase() === 'alpha') {
        alphaDays++;
      }

      // Count late days and calculate lateness
      if (status.toLowerCase() === 'terlambat' || status.toLowerCase() === 'late') {
        lateDays++;

        // Calculate lateness in minutes
        if (record.time_in) {
          const timeIn = new Date(`2000-01-01T${record.time_in}`);
          const standardStart = new Date('2000-01-01T08:00:00'); // Assuming 8 AM start
          const latenessMs = timeIn.getTime() - standardStart.getTime();
          const latenessMinutes = Math.max(0, latenessMs / (1000 * 60));
          totalLatenessMinutes += latenessMinutes;
        }
      }

      // Collect work hours for consistency calculation
      if (record.work_hour && record.work_hour > 0) {
        workHours.push(parseFloat(record.work_hour));
      }
    });

    // Calculate alpha rate (percentage)
    const alphaRate = totalDays > 0 ? (alphaDays / totalDays) * 100 : 0;

    // Calculate average lateness in minutes
    const avgLatenessMinutes = lateDays > 0 ? totalLatenessMinutes / lateDays : 0;

    // Calculate lateness frequency (percentage)
    const latenessFrequency = totalDays > 0 ? (lateDays / totalDays) * 100 : 0;

    // Calculate work hour consistency score
    let workHourConsistency = 75; // Default score
    if (workHours.length > 1) {
      const avgWorkHours = workHours.reduce((sum, h) => sum + h, 0) / workHours.length;
      const variance =
        workHours.reduce((sum, h) => sum + Math.pow(h - avgWorkHours, 2), 0) / workHours.length;
      const standardDeviation = Math.sqrt(variance);

      // Convert to consistency score (lower deviation = higher consistency)
      // Max score 100, decreases as deviation increases
      workHourConsistency = Math.max(20, 100 - standardDeviation * 20);
    }

    return {
      alpha_rate: Math.round(alphaRate * 100) / 100,
      avg_lateness_minutes: Math.round(avgLatenessMinutes * 100) / 100,
      lateness_frequency: Math.round(latenessFrequency * 100) / 100,
      work_hour_consistency: Math.round(workHourConsistency * 100) / 100,
      total_days: totalDays,
      alpha_days: alphaDays,
      late_days: lateDays
    };
  } catch (error) {
    logger.error('Error calculating user metrics:', error);
    return {
      alpha_rate: 0,
      avg_lateness_minutes: 0,
      lateness_frequency: 0,
      work_hour_consistency: 75
    };
  }
};
/**
 * Get summary report for admin and management with Discipline Index integration
 * Provides aggregated summary data (counts by status & category)
 * AND detailed attendance report with time filters, pagination, and discipline scoring
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
      `Generating summary report with discipline analysis - Period: ${period}, Range: ${startDateStr || 'unlimited'} to ${endDateStr || 'unlimited'}`
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
    });

    // Proses hasil query menjadi objek summary dengan format yang lebih baik
    const summary = {
      total_ontime: 0,
      total_late: 0,
      total_early: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfh: 0,
      total_wfa: 0
    };

    // Proses status counts - hitung berdasarkan nama status
    statusCounts.forEach((item) => {
      const statusName = item.status?.attendance_status_name || 'unknown';
      const total = parseInt(item.dataValues.total);

      // Mapping status ke field summary dengan dukungan dynamic status logic
      switch (statusName.toLowerCase()) {
        case 'tepat waktu':
        case 'ontime':
          summary.total_ontime = total;
          break;
        case 'terlambat':
        case 'late':
          summary.total_late = total;
          break;
        case 'early':
        case 'lebih awal':
          summary.total_early = total;
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

    // ==== SMART ANALYTICS: CALCULATE DISCIPLINE INDEX ====

    // Get unique users from the attendance data
    const uniqueUsers = {};
    attendanceData.rows.forEach((attendance) => {
      const userId = attendance.user?.id_users;
      if (userId && !uniqueUsers[userId]) {
        uniqueUsers[userId] = attendance.user;
      }
    });

    // Calculate discipline index for each user
    const userDisciplineMap = {};
    const disciplineCalculationPromises = Object.keys(uniqueUsers).map(async (userId) => {
      try {
        const userMetrics = await calculateUserMetrics(parseInt(userId), startDate, endDate);
        const disciplineResult = await fuzzyAhpEngine.calculateDisciplineIndex(userMetrics);

        userDisciplineMap[userId] = {
          discipline_score: disciplineResult.score,
          discipline_label: disciplineResult.label,
          discipline_breakdown: disciplineResult.breakdown
        };

        logger.info(
          `Discipline calculated for user ${userId}: ${disciplineResult.score} (${disciplineResult.label})`
        );
      } catch (error) {
        logger.error(`Error calculating discipline for user ${userId}:`, error);
        userDisciplineMap[userId] = {
          discipline_score: 50,
          discipline_label: 'Cukup Disiplin',
          discipline_breakdown: { error: 'Calculation failed' }
        };
      }
    });

    // Wait for all discipline calculations to complete
    await Promise.all(disciplineCalculationPromises);

    logger.info(`Discipline analysis completed for ${Object.keys(userDisciplineMap).length} users`);

    // ==== TRANSFORMASI DATA LAPORAN DETAIL DENGAN DISIPLIN INDEX ====

    const transformedData = attendanceData.rows.map((attendance) => {
      const user = attendance.user;
      const location = attendance.location;
      const category = attendance.attendance_category;
      const status = attendance.status;

      // Pisahkan full_name dan role
      const fullName = user?.full_name || 'Unknown User';
      const roleName = user?.role?.role_name || null;
      const userId = user?.id_users;

      // Get discipline data for this user
      const disciplineData = userId ? userDisciplineMap[userId] : null;

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
        user_id: userId || null,
        full_name: fullName,
        role: roleName,
        nip_nim: user?.nip_nim || null,
        email: user?.email || null,
        time_in: formatTimeOnly(timeIn),
        time_out: formatTimeOnly(timeOut),
        work_hour: formatWorkHour(workHour),
        attendance_date: attendance.attendance_date,
        location_details: locationDetails,
        status: status?.attendance_status_name || 'unknown',
        information: information,
        notes: attendance.notes || '',

        // ==== NEW: DISCIPLINE INDEX INTEGRATION ====
        discipline_score: disciplineData?.discipline_score || null,
        discipline_label: disciplineData?.discipline_label || null,
        discipline_breakdown: disciplineData?.discipline_breakdown || null
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

    // ==== ANALYTICS SUMMARY ====
    const analyticsUsersCount = Object.keys(userDisciplineMap).length;
    const avgDisciplineScore =
      analyticsUsersCount > 0
        ? Object.values(userDisciplineMap).reduce((sum, d) => sum + d.discipline_score, 0) /
          analyticsUsersCount
        : 0;

    logger.info(
      `Summary report with discipline analysis generated successfully - ${attendanceData.count} detail records, ${analyticsUsersCount} users analyzed, avg discipline: ${avgDisciplineScore.toFixed(1)}`
    );

    // ==== BENTUK DAN KIRIM RESPONS AKHIR (HTTP 200 OK) ====

    res.status(200).json({
      success: true,
      summary: summary,
      report: {
        data: transformedData,
        pagination: pagination
      },
      analytics: {
        discipline_analysis: {
          users_analyzed: analyticsUsersCount,
          average_discipline_score: Math.round(avgDisciplineScore * 100) / 100,
          methodology: 'Fuzzy AHP Engine',
          criteria: ['Alpha Rate', 'Lateness Severity', 'Lateness Frequency', 'Work Focus']
        }
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
      message: 'Summary report with discipline analysis generated successfully'
    });
  } catch (error) {
    logger.error(`Error generating summary report with discipline analysis: ${error.message}`, {
      stack: error.stack,
      query: req.query
    });
    next(error);
  }
};

export default {
  getSummaryReport
};
