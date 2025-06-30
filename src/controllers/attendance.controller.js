import { Op } from 'sequelize';
import Holidays from 'date-holidays';

import sequelize from '../config/database.js';
import {
  Attendance,
  Booking,
  Location,
  Settings,
  AttendanceCategory,
  AttendanceStatus,
  BookingStatus,
  User,
  Role,
  LocationEvent
} from '../models/index.js';
import { calculateDistance } from '../utils/geofence.js';
import { formatWorkHour, calculateWorkHour, formatTimeOnly } from '../utils/workHourFormatter.js';
import { applySearch } from '../utils/searchHelper.js';
import { triggerAutoCheckout } from '../jobs/autoCheckout.job.js';
import { triggerResolveWfaBookings } from '../jobs/resolveWfaBookings.job.js';
import { triggerCreateGeneralAlpha } from '../jobs/createGeneralAlpha.job.js';
import fuzzyEngine from '../utils/fuzzyAhpEngine.js';
import logger from '../utils/logger.js';

export const clockIn = async (req, res) => {
  try {
    const { location } = req.body;
    const userId = req.user.id;

    // Check if user already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      where: {
        userId,
        clockIn: {
          [Op.gte]: today
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    const attendance = await Attendance.create({
      userId,
      clockIn: new Date(),
      location
    });

    res.status(201).json({ message: 'Clock in successful', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const clockOut = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      where: {
        userId,
        clockIn: {
          [Op.gte]: today
        },
        clockOut: null
      }
    });

    if (!attendance) {
      return res.status(400).json({ message: 'No clock in record found for today' });
    }

    await attendance.update({ clockOut: new Date() });

    res.json({ message: 'Clock out successful', attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'daily', page = 1, limit = 5 } = req.query;

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);

    // Determine date range based on period
    let startDate, endDate;
    let whereClause = { user_id: userId };
    switch (period) {
      case 'daily': {
        // Start and end of today
        startDate = new Date(jakartaTime);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(jakartaTime);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case 'weekly': {
        // Start of this week (Monday) to end of this week (Sunday)
        const dayOfWeek = jakartaTime.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0

        startDate = new Date(jakartaTime);
        startDate.setDate(jakartaTime.getDate() + diffToMonday);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case 'monthly': {
        // Start and end of current month
        startDate = new Date(jakartaTime.getFullYear(), jakartaTime.getMonth(), 1);
        endDate = new Date(jakartaTime.getFullYear(), jakartaTime.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }

      case 'all':
        // No date filter
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Period parameter tidak valid. Gunakan: daily, weekly, monthly, atau all'
        });
    } // Add date filter if not 'all'
    if (period !== 'all') {
      whereClause.attendance_date = {
        [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      };
    }

    // Run queries in parallel for efficiency
    const [summaryByStatus, summaryByCategory, attendanceData] = await Promise.all([
      // Query 1: Summary by status
      Attendance.findAll({
        where: whereClause,
        attributes: ['status_id', [sequelize.fn('COUNT', sequelize.col('status_id')), 'count']],
        group: ['status_id'],
        raw: true
      }),

      // Query 2: Summary by category
      Attendance.findAll({
        where: whereClause,
        attributes: ['category_id', [sequelize.fn('COUNT', sequelize.col('category_id')), 'count']],
        group: ['category_id'],
        raw: true
      }),

      // Query 3: Detailed attendance list with pagination
      Attendance.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: AttendanceCategory,
            as: 'attendance_category',
            attributes: ['category_name']
          },
          {
            model: AttendanceStatus,
            as: 'status',
            attributes: ['attendance_status_name']
          },
          {
            model: Location,
            as: 'location',
            attributes: ['description'],
            required: false
          }
        ],
        order: [['attendance_date', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      })
    ]); // Process summary data with updated status mapping
    const summary = {
      total_ontime: 0,
      total_late: 0,
      total_early: 0,
      total_alpha: 0,
      total_wfo: 0,
      total_wfa: 0
    }; // Map status counts with dynamic status logic: 1=ontime, 2=late, 4=early, 3=alpha
    summaryByStatus.forEach((item) => {
      const count = parseInt(item.count);

      switch (item.status_id) {
        case 1:
          summary.total_ontime = count;
          break;
        case 2:
          summary.total_late = count;
          break;
        case 4:
          summary.total_early = count;
          break;
        case 3:
          summary.total_alpha = count;
          break;
      }
    });

    // Map category counts (assuming: 1=WFO, 3=WFA)
    summaryByCategory.forEach((item) => {
      const count = parseInt(item.count);

      switch (item.category_id) {
        case 1:
          summary.total_wfo = count;
          break;
        case 3:
          summary.total_wfa = count;
          break;
      }
    }); // Transform attendance data
    const transformedData = attendanceData.rows.map((att) => {
      // Parse attendance date
      const attendanceDate = new Date(att.attendance_date);

      // Format date components
      const day = attendanceDate.getDate().toString().padStart(2, '0');
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];
      const month = months[attendanceDate.getMonth()];
      const year = attendanceDate.getFullYear();
      const monthYear = `${month} ${year}`;

      return {
        id_attendance: att.id_attendance,
        attendance_date: att.attendance_date,
        date: day,
        monthYear: monthYear,
        time_in: formatTimeOnly(att.time_in),
        time_out: formatTimeOnly(att.time_out),
        work_hour: formatWorkHour(att.work_hour),
        category: att.attendance_category ? att.attendance_category.category_name : null,
        status: att.status ? att.status.attendance_status_name : null,
        location: att.location ? att.location.description : null,
        notes: att.notes
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(attendanceData.count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        summary,
        attendances: transformedData,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: attendanceData.count,
          items_per_page: parseInt(limit),
          has_next_page: parseInt(page) < totalPages,
          has_prev_page: parseInt(page) > 1
        }
      },
      message: 'Riwayat absensi berhasil diambil'
    });
  } catch (error) {
    logger.error('Error in getAttendanceHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const checkIn = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    // 1. Get Input Data
    const userId = req.user.id;
    const { category_id, latitude, longitude, notes = '', booking_id } = req.body;

    // Definisikan "Hari Ini" dengan timezone Asia/Jakarta yang benar
    const now = new Date();
    // Gunakan toLocaleString untuk mendapatkan waktu Jakarta yang akurat
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const localTime = jakartaTime; // Waktu sekarang dalam timezone Jakarta
    const todayDate = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    // 1. First Layer Validation - Check Duplication
    const existingAttendance = await Attendance.findOne({
      where: {
        user_id: userId,
        attendance_date: todayDate
      },
      transaction
    });

    if (existingAttendance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan check-in hari ini.'
      });
    } // 2. Get Settings from Database
    const settings = await Settings.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'checkin.start_time',
            'checkin.end_time',
            'checkin.late_time',
            'workday.holiday_checkin_enabled',
            'workday.weekend_checkin_enabled',
            'workday.holiday_region'
          ]
        }
      },
      transaction
    });

    // Convert settings array ke object untuk kemudahan akses
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    // Set default values jika setting tidak ditemukan
    const checkinStartTime = settingsMap['checkin.start_time'] || '08:00:00';
    const checkinEndTime = settingsMap['checkin.end_time'] || '18:00:00';
    const lateTime = settingsMap['checkin.late_time'] || '10:00:00';
    const holidayCheckinEnabled = settingsMap['workday.holiday_checkin_enabled'] === 'true';
    const weekendCheckinEnabled = settingsMap['workday.weekend_checkin_enabled'] === 'true';
    const holidayRegion = settingsMap['workday.holiday_region'] || 'ID';

    // 3. Validasi Hari Libur - HANYA untuk WFO (category_id = 1) dan WFH (category_id = 2)
    // WFA (category_id = 3) SKIP validasi ini sepenuhnya
    if (category_id === 1 || category_id === 2) {
      const hd = new Holidays(holidayRegion);
      const isHoliday = hd.isHoliday(localTime);
      const isWeekend = localTime.getDay() === 0 || localTime.getDay() === 6;

      if ((isHoliday && !holidayCheckinEnabled) || (isWeekend && !weekendCheckinEnabled)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Check-in tidak diizinkan pada hari libur.'
        });
      }
    } // 4. Validasi Jam Kerja
    // Calculate time using proper Jakarta timezone directly from Date object
    const currentHour = jakartaTime.getHours();
    const currentMinute = jakartaTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const checkinStartMinutes =
      parseInt(checkinStartTime.split(':')[0]) * 60 + parseInt(checkinStartTime.split(':')[1]);
    const checkinEndMinutes =
      parseInt(checkinEndTime.split(':')[0]) * 60 + parseInt(checkinEndTime.split(':')[1]);

    if (currentTimeMinutes < checkinStartMinutes || currentTimeMinutes > checkinEndMinutes) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Check-in hanya bisa dilakukan pada jam ${checkinStartTime.substring(0, 5)} - ${checkinEndTime.substring(0, 5)}.`
      });
    } // 5. Core Logic Based on category_id
    let validatedLocationId = null;
    let validatedBookingId = null;

    if (category_id === 1) {
      // WFO (Work From Office)
      // Step A: Get Office Location from Database
      const wfoLocation = await Location.findOne({
        where: {
          id_attendance_categories: 1,
          user_id: null
        },
        transaction
      });

      if (!wfoLocation) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Konfigurasi lokasi kantor (WFO) tidak ditemukan. Silakan hubungi admin.'
        });
      }

      // Step B: Geofencing Validation
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(wfoLocation.latitude),
        parseFloat(wfoLocation.longitude)
      );

      if (distance > wfoLocation.radius) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Anda berada di luar radius lokasi yang diizinkan.'
        });
      }

      // Step C: Set Location ID
      validatedLocationId = wfoLocation.location_id;
    } else if (category_id === 2) {
      // WFH (Work From Home)
      const wfhLocation = await Location.findOne({
        where: {
          user_id: userId,
          id_attendance_categories: 2
        },
        transaction
      });

      if (!wfhLocation) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Lokasi WFH tidak ditemukan. Silakan hubungi admin.'
        });
      }

      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(wfhLocation.latitude),
        parseFloat(wfhLocation.longitude)
      );

      if (distance > wfhLocation.radius) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Anda berada di luar radius lokasi yang diizinkan.'
        });
      }

      validatedLocationId = wfhLocation.location_id;
    } else if (category_id === 3) {
      // WFA (Work From Anywhere)
      if (!booking_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking ID wajib untuk WFA.'
        });
      }

      const booking = await Booking.findOne({
        where: {
          booking_id: booking_id
        },
        include: [
          {
            model: Location,
            as: 'location'
          }
        ],
        transaction
      });

      if (!booking) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking tidak ditemukan.'
        });
      }

      // Additional validations for WFA booking
      if (booking.user_id !== userId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking tidak valid untuk user ini.'
        });
      }

      if (booking.status !== 1) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking belum disetujui.'
        });
      }

      if (booking.schedule_date !== todayDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking tidak berlaku untuk hari ini.'
        });
      } // Geofencing validation for WFA location
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(booking.location.latitude),
        parseFloat(booking.location.longitude)
      );

      if (distance > booking.location.radius) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Anda berada di luar radius lokasi yang diizinkan.'
        });
      }

      validatedLocationId = booking.location.location_id;
      validatedBookingId = booking_id;
    } // 6. Determine Attendance Status Dynamically (early, ontime, late)
    const lateTimeMinutes =
      parseInt(lateTime.split(':')[0]) * 60 + parseInt(lateTime.split(':')[1]);

    let determinedStatusId;
    let statusLabel;

    // Logika penentuan status berdasarkan aturan dinamis dari database:
    if (currentTimeMinutes < checkinStartMinutes) {
      // Early: waktu check-in < checkin.start_time
      determinedStatusId = 4; // Early status (sesuai dengan prasyarat tabel attendance_statuses)
      statusLabel = 'EARLY';
      logger.info(
        `Check-in classified as EARLY: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} < ${checkinStartTime}`
      );
    } else if (currentTimeMinutes > lateTimeMinutes) {
      // Late: waktu check-in > checkin.late_time
      determinedStatusId = 2; // Late status
      statusLabel = 'LATE';
      logger.info(
        `Check-in classified as LATE: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} > ${lateTime}`
      );
    } else {
      // On Time: between start_time and late_time
      determinedStatusId = 1; // On time status
      statusLabel = 'ON TIME';
      logger.info(
        `Check-in classified as ON TIME: ${checkinStartTime} <= ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} <= ${lateTime}`
      );
    }

    // 7. Save Data to Database dengan status yang telah ditentukan secara dinamis
    const attendanceData = {
      user_id: userId,
      category_id: category_id,
      status_id: determinedStatusId, // <-- GUNAKAN VARIABEL HASIL LOGIKA DINAMIS
      location_id: validatedLocationId, // This will contain actual location_id for WFO
      booking_id: validatedBookingId,
      time_in: localTime,
      attendance_date: todayDate,
      notes: notes,
      created_at: localTime,
      updated_at: localTime
    };

    const newAttendance = await Attendance.create(attendanceData, { transaction });
    await transaction.commit();

    // 8. Send Success Response dengan informasi status yang telah ditentukan
    res.status(201).json({
      success: true,
      data: {
        ...newAttendance.toJSON(),
        status_classification: {
          status_id: determinedStatusId,
          status_label: statusLabel,
          check_in_time: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
          time_rules: {
            start_time: checkinStartTime,
            late_time: lateTime
          }
        }
      },
      message: `Check-in berhasil dengan status: ${statusLabel}`
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Debug endpoint untuk troubleshooting check-in time validation
export const debugCheckInTime = async (req, res) => {
  try {
    // Get current Jakarta time with proper timezone handling
    const today = new Date();
    const localTime = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const todayDate = localTime.toISOString().split('T')[0];

    // Simple test first
    const testHour = localTime.getHours();
    const testMinute = localTime.getMinutes();

    console.log('=== DEBUG TIMEZONE TEST ===');
    console.log('Raw UTC time:', today.toISOString());
    console.log('Raw local time:', today.toString());
    console.log('Jakarta time calculated:', localTime.toISOString());
    console.log('Test extracted hour:', testHour);
    console.log('Test extracted minute:', testMinute);
    console.log('=== END DEBUG ===');

    // Get settings from database
    const settings = await Settings.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'checkin.start_time',
            'checkin.end_time',
            'checkin.late_time',
            'checkout.auto_time',
            'workday.holiday_checkin_enabled',
            'workday.weekend_checkin_enabled',
            'workday.holiday_region'
          ]
        }
      }
    });

    // Convert settings
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    const checkinStartTime = settingsMap['checkin.start_time'] || '08:00:00';
    const checkinEndTime = settingsMap['checkin.end_time'] || '18:00:00';
    const lateTime = settingsMap['checkin.late_time'] || '10:00:00';

    // Calculate time in minutes using proper Jakarta timezone
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    console.log('DEBUG TIMEZONE:');
    console.log('today (UTC):', today.toISOString());
    console.log('localTime (Jakarta):', localTime.toISOString());
    console.log('localTime string:', localTime.toString());
    console.log('extracted hour:', currentHour);
    console.log('extracted minute:', currentMinute);

    const checkinStartMinutes =
      parseInt(checkinStartTime.split(':')[0]) * 60 + parseInt(checkinStartTime.split(':')[1]);
    const checkinEndMinutes =
      parseInt(checkinEndTime.split(':')[0]) * 60 + parseInt(checkinEndTime.split(':')[1]);

    const isWithinWindow =
      currentTimeMinutes >= checkinStartMinutes && currentTimeMinutes <= checkinEndMinutes;

    res.json({
      success: true,
      debug_info: {
        current_utc_time: today.toISOString(),
        current_jakarta_time: localTime.toISOString(),
        today_date: todayDate,
        current_hour: currentHour,
        current_minute: currentMinute,
        current_time_minutes: currentTimeMinutes,
        test_hour: testHour,
        test_minute: testMinute,
        settings_from_db: settingsMap,
        calculated_values: {
          checkin_start_time: checkinStartTime,
          checkin_end_time: checkinEndTime,
          late_time: lateTime,
          checkin_start_minutes: checkinStartMinutes,
          checkin_end_minutes: checkinEndMinutes
        },
        validation: {
          is_within_checkin_window: isWithinWindow,
          too_early: currentTimeMinutes < checkinStartMinutes,
          too_late: currentTimeMinutes > checkinEndMinutes
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
};

export const getAttendanceStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Definisikan "Hari Ini" dengan timezone Asia/Jakarta yang benar
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const todayDate = localTime.toISOString().split('T')[0]; // YYYY-MM-DD format    // Ambil pengaturan dari database
    const settings = await Settings.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'checkin.start_time',
            'checkin.end_time',
            'checkout.auto_time',
            'workday.holiday_checkin_enabled',
            'workday.holiday_region'
          ]
        }
      }
    });

    // Convert settings array ke object untuk kemudahan akses
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    }); // Set default values jika setting tidak ditemukan
    const checkinStartTime = settingsMap['checkin.start_time'] || '08:00:00';
    const checkinEndTime = settingsMap['checkin.end_time'] || '18:00:00';
    const checkoutAutoTime = settingsMap['checkout.auto_time'] || '17:00:00';
    const holidayCheckinEnabled = settingsMap['workday.holiday_checkin_enabled'] === 'true';
    const holidayRegion = settingsMap['workday.holiday_region'] || 'ID'; // Indonesia

    // Cek hari libur menggunakan date-holidays
    const hd = new Holidays(holidayRegion);
    const isHoliday = hd.isHoliday(localTime);
    const isWeekend = localTime.getDay() === 0 || localTime.getDay() === 6; // Sunday = 0, Saturday = 6
    const isHolidayOrWeekend = isHoliday || isWeekend;

    // Cek absensi hari ini
    const currentAttendance = await Attendance.findOne({
      where: {
        user_id: userId,
        attendance_date: todayDate
      },
      include: [
        {
          model: Location,
          as: 'location',
          include: [
            {
              model: AttendanceCategory,
              as: 'attendance_category'
            }
          ]
        }
      ]
    });

    // Cek booking WFA hari ini
    const todayBooking = await Booking.findOne({
      where: {
        user_id: userId,
        schedule_date: todayDate,
        status: 1 // approved (berdasarkan booking_status table)
      },
      include: [
        {
          model: Location,
          as: 'location',
          include: [
            {
              model: AttendanceCategory,
              as: 'attendance_category'
            }
          ]
        },
        {
          model: BookingStatus,
          as: 'booking_status'
        }
      ]
    }); // Tentukan active_mode dan active_location
    let active_mode, active_location;

    if (todayBooking) {
      active_mode = 'Work From Anywhere';
      active_location = {
        location_id: todayBooking.location.location_id,
        latitude: parseFloat(todayBooking.location.latitude),
        longitude: parseFloat(todayBooking.location.longitude),
        radius: todayBooking.location.radius,
        description: todayBooking.location.description,
        category: todayBooking.location.attendance_category.category_name
      };
    } else {
      // Get WFO location from database
      const wfoLocation = await Location.findOne({
        where: {
          id_attendance_categories: 1,
          user_id: null
        }
      });

      if (wfoLocation) {
        active_mode = 'Work From Office';
        active_location = {
          location_id: wfoLocation.location_id,
          latitude: parseFloat(wfoLocation.latitude),
          longitude: parseFloat(wfoLocation.longitude),
          radius: wfoLocation.radius,
          description: wfoLocation.description,
          address: wfoLocation.address,
          category: 'Work From Office'
        };
      } else {
        // Fallback to hardcoded values if WFO location not found in database
        active_mode = 'Work From Office';
        active_location = {
          location_id: null,
          latitude: -6.2088,
          longitude: 106.8456,
          radius: 100,
          description: 'Kantor Pusat Jakarta',
          address: 'Jl. Sudirman No. 1, Jakarta Pusat',
          category: 'Work From Office'
        };
      }
    } // Tentukan waktu check-in yang diizinkan (08:00 - 18:00)
    // Calculate time using proper Jakarta timezone directly from Date object
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const checkinStartMinutes =
      parseInt(checkinStartTime.split(':')[0]) * 60 + parseInt(checkinStartTime.split(':')[1]);
    const checkinEndMinutes =
      parseInt(checkinEndTime.split(':')[0]) * 60 + parseInt(checkinEndTime.split(':')[1]);

    // Tentukan can_check_in
    const can_check_in =
      (!isHolidayOrWeekend || holidayCheckinEnabled) &&
      !currentAttendance &&
      currentTimeMinutes >= checkinStartMinutes &&
      currentTimeMinutes <= checkinEndMinutes;

    // Tentukan can_check_out
    const can_check_out = currentAttendance && !currentAttendance.time_out; // Bentuk respons
    const response = {
      success: true,
      data: {
        can_check_in,
        can_check_out,
        checked_in_at: currentAttendance ? formatTimeOnly(currentAttendance.time_in) : null,
        checked_out_at:
          currentAttendance && currentAttendance.time_out
            ? formatTimeOnly(currentAttendance.time_out)
            : null,
        active_mode,
        active_location,
        today_date: todayDate,
        is_holiday: isHolidayOrWeekend,
        holiday_checkin_enabled: holidayCheckinEnabled,
        current_time: localTime.toISOString(),
        checkin_window: {
          start_time: checkinStartTime,
          end_time: checkinEndTime
        },
        checkout_auto_time: checkoutAutoTime
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    // 1. Dapatkan Input
    const attendanceId = req.params.id;
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    // 2. Validasi Awal - Cari attendance record
    const attendance = await Attendance.findByPk(attendanceId, { transaction });

    if (!attendance) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Data attendance tidak ditemukan'
      });
    }

    // Pastikan attendance milik user yang sedang login
    if (attendance.user_id !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk melakukan check-out pada data ini'
      });
    }

    // Pastikan belum melakukan check-out
    if (attendance.time_out !== null) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan check-out hari ini.'
      });
    }

    // 3. Validasi Lokasi Fleksibel
    const validLocations = [];

    // Ambil Lokasi WFO (kantor - id = 1)
    const wfoLocation = await Location.findOne({
      where: {
        id_attendance_categories: 1,
        user_id: null
      },
      transaction
    });

    if (wfoLocation) {
      validLocations.push(wfoLocation);
    }

    // Ambil Lokasi WFH untuk user ini
    const wfhLocation = await Location.findOne({
      where: {
        id_attendance_categories: 2,
        user_id: userId
      },
      transaction
    });

    if (wfhLocation) {
      validLocations.push(wfhLocation);
    }

    // Ambil Lokasi WFA Aktif (booking yang approved untuk hari ini)
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
    const todayDate = localTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    const activeBooking = await Booking.findOne({
      where: {
        user_id: userId,
        status: 2, // status approved (assuming 2 is approved)
        schedule_date: todayDate
      },
      include: [
        {
          model: Location,
          as: 'location',
          required: true
        }
      ],
      transaction
    });

    if (activeBooking && activeBooking.location) {
      validLocations.push(activeBooking.location);
    }

    // Validasi jarak dengan semua lokasi valid
    let isWithinRadius = false;

    for (const location of validLocations) {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(location.latitude),
        parseFloat(location.longitude)
      );

      const allowedRadius = location.radius || 100; // default 100 meter

      if (distance <= allowedRadius) {
        isWithinRadius = true;
        break;
      }
    }

    if (!isWithinRadius) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Anda berada di luar radius lokasi yang diizinkan untuk check-out.'
      });
    } // 4. Update Database
    const now = new Date();
    // Gunakan timezone Jakarta yang benar
    const timeOut = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const timeIn = new Date(attendance.time_in);

    // Hitung work_hour menggunakan utility function
    const workHour = calculateWorkHour(timeIn, timeOut);

    // Update attendance record
    await attendance.update(
      {
        time_out: timeOut,
        work_hour: workHour
      },
      { transaction }
    );

    await transaction.commit();

    // 5. Kirim Respons Sukses
    res.status(200).json({
      success: true,
      data: {
        id_attendance: attendance.id_attendance,
        attendance_date: attendance.attendance_date,
        time_in: formatTimeOnly(attendance.time_in),
        time_out: formatTimeOnly(attendance.time_out),
        work_hour: formatWorkHour(attendance.work_hour),
        user_id: attendance.user_id,
        category_id: attendance.category_id,
        status_id: attendance.status_id,
        location_id: attendance.location_id,
        booking_id: attendance.booking_id,
        notes: attendance.notes
      },
      message: 'Check-out berhasil'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    // Langkah 1: Dapatkan ID dari Parameter URL
    const { id } = req.params;

    // Langkah 2: Cari Record Absensi
    const attendanceRecord = await Attendance.findByPk(id);

    // Langkah 3: Handle Jika Data Tidak Ditemukan
    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Data absensi tidak ditemukan.'
      });
    }

    // Langkah 4: Lakukan Hard Delete
    await attendanceRecord.destroy();

    // Langkah 5: Kirim Respons Sukses
    res.status(200).json({
      success: true,
      message: 'Data absensi berhasil dihapus.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all attendances for admin/management with search, pagination and sorting
 * Protected route for admin and management roles only
 */
export const getAllAttendances = async (req, res, next) => {
  try {
    // Get query parameters with defaults
    const { search, page = 1, limit = 10 } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Parameter page dan limit harus berupa angka positif'
      });
    }

    // Calculate offset for pagination
    const offset = (pageNum - 1) * limitNum;

    // Build query options
    const queryOptions = {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name', 'nip_nim', 'email'],
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
          required: false
        },
        {
          model: AttendanceStatus,
          as: 'status',
          attributes: ['attendance_status_name']
        },
        {
          model: AttendanceCategory,
          as: 'attendance_category',
          attributes: ['category_name']
        }
      ],
      order: [['id_attendance', 'DESC']],
      limit: limitNum,
      offset: offset,
      distinct: true // Important for correct count with includes
    };

    // Apply search if provided
    if (search && search.trim()) {
      applySearch(queryOptions, search, ['$user.full_name$', '$user.nip_nim$']);
    }

    // Execute query
    const { count, rows } = await Attendance.findAndCountAll(queryOptions);

    // Transform data response
    const transformedData = rows.map((att) => {
      // Format work hour using utility
      const formattedWorkHour = formatWorkHour(att.work_hour);

      return {
        id_attendance: att.id_attendance,
        id: att.user?.id_users || null,
        full_name: att.user?.full_name || 'Unknown User',
        nip_nim: att.user?.nip_nim || null,
        role_name: att.user?.role?.role_name || null,
        time_in: formatTimeOnly(att.time_in),
        time_out: formatTimeOnly(att.time_out),
        work_hour: formattedWorkHour,
        attendance_date: att.attendance_date,
        location: att.location
          ? {
              location_id: att.location.location_id,
              description: att.location.description,
              latitude: parseFloat(att.location.latitude),
              longitude: parseFloat(att.location.longitude)
            }
          : null,
        status: att.status?.attendance_status_name || 'Unknown',
        information: att.attendance_category?.category_name || 'Unknown',
        notes: att.notes
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limitNum);

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Data absensi berhasil diambil',
      data: transformedData,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: count,
        records_per_page: limitNum,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manual trigger for automatic checkout (for testing purposes)
 * This endpoint allows admins to manually trigger the auto checkout process
 */
export const manualAutoCheckout = async (req, res, next) => {
  try {
    // Only allow admins to trigger manual auto checkout
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin dan manajemen yang dapat memicu auto checkout manual.'
      });
    }

    // Trigger the auto checkout job
    await triggerAutoCheckout();

    res.status(200).json({
      success: true,
      message: 'Auto checkout manual berhasil dipicu. Periksa log untuk detail hasil.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get auto checkout settings (for debugging/testing)
 */
export const getAutoCheckoutSettings = async (req, res, next) => {
  try {
    // Get the auto checkout time setting from database
    const autoTimeSetting = await Settings.findOne({
      where: {
        setting_key: 'checkout.auto_time'
      }
    });

    // Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const currentTimeString = jakartaTime.toISOString().substring(11, 19);
    const currentDate = jakartaTime.toISOString().split('T')[0];

    // Find active attendances (checked in but not checked out)
    const activeAttendances = await Attendance.findAll({
      where: {
        attendance_date: currentDate,
        time_out: null
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name', 'nip_nim']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        auto_checkout_time: autoTimeSetting?.setting_value || 'Not configured',
        current_jakarta_time: currentTimeString,
        current_date: currentDate,
        active_attendances_count: activeAttendances.length,
        active_attendances: activeAttendances.map((att) => ({
          id_attendance: att.id_attendance,
          user_id: att.user_id,
          user_name: att.user?.full_name,
          time_in: formatTimeOnly(att.time_in),
          attendance_date: att.attendance_date
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Setup smart auto checkout configuration and process all past attendance records
 * This endpoint will:
 * 1. Create/update the smart checkout configuration in database
 * 2. Process all past attendance records using smart predictions
 */
export const setupAutoCheckoutConfig = async (req, res, next) => {
  try {
    // Only allow admins to setup auto checkout
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message:
          'Akses ditolak. Hanya admin dan manajemen yang dapat mengatur konfigurasi auto checkout.'
      });
    }

    const transaction = await sequelize.transaction();

    try {
      logger.info('Setting up smart auto checkout configuration...');

      // 1. Update the settings to indicate smart checkout is enabled
      const [setting, created] = await Settings.findOrCreate({
        where: { setting_key: 'checkout.smart_enabled' },
        defaults: {
          setting_key: 'checkout.smart_enabled',
          setting_value: 'true',
          description: 'Smart Auto Checkout menggunakan Fuzzy AHP untuk prediksi waktu pulang',
          updated_at: new Date()
        },
        transaction
      });

      if (!created) {
        await setting.update(
          {
            setting_value: 'true',
            description: 'Smart Auto Checkout menggunakan Fuzzy AHP untuk prediksi waktu pulang',
            updated_at: new Date()
          },
          { transaction }
        );
      }

      // 2. Create/update fallback time setting
      const [fallbackSetting] = await Settings.findOrCreate({
        where: { setting_key: 'checkout.fallback_time' },
        defaults: {
          setting_key: 'checkout.fallback_time',
          setting_value: '17:00:00',
          description: 'Waktu fallback jika smart prediction gagal',
          updated_at: new Date()
        },
        transaction
      });

      logger.info(`Smart checkout configuration ${created ? 'created' : 'updated'}: enabled`);

      // 3. Get current Jakarta time
      const now = new Date();
      const jakartaOffset = 7 * 60; // UTC+7 in minutes
      const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
      const currentDate = jakartaTime.toISOString().split('T')[0];

      logger.info(`Processing smart auto checkout for dates before: ${currentDate}`);

      // 4. Find all attendance records that need auto checkout (past dates)
      const pendingAttendances = await Attendance.findAll({
        where: {
          time_out: null, // Not yet checked out
          attendance_date: {
            [Op.lt]: currentDate // Only past dates (not today)
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id_users', 'full_name']
          }
        ],
        transaction
      });

      logger.info(`Found ${pendingAttendances.length} past attendance records to auto checkout`);

      let successCount = 0;
      let errorCount = 0;
      let smartPredictionCount = 0;
      let fallbackCount = 0;

      // 5. Process each attendance record with smart prediction
      for (const attendance of pendingAttendances) {
        try {
          const attendanceDate = attendance.attendance_date;
          let checkoutTime;
          let usedSmartPrediction = false;

          try {
            // Get user's historical work pattern
            const oneMonthAgo = new Date(attendanceDate);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            const userAttendances = await Attendance.findAll({
              where: {
                user_id: attendance.user_id,
                attendance_date: {
                  [Op.between]: [oneMonthAgo.toISOString().split('T')[0], attendanceDate]
                },
                time_in: { [Op.not]: null },
                time_out: { [Op.not]: null }
              },
              limit: 15,
              transaction
            });

            let historicalHours = 8.0;
            if (userAttendances.length >= 2) {
              const totalHours = userAttendances.reduce((sum, att) => {
                const tIn = new Date(att.time_in);
                const tOut = new Date(att.time_out);
                const hours = (tOut - tIn) / (1000 * 60 * 60);
                return sum + (hours > 0 && hours <= 16 ? hours : 8);
              }, 0);
              historicalHours = totalHours / userAttendances.length;
            }
            const timeIn = new Date(attendance.time_in);
            const checkinHours = timeIn.getHours() + timeIn.getMinutes() / 60;
            const attendanceDateObj = new Date(attendanceDate);

            // Get smart prediction using imported function
            const predictedDuration = await fuzzyEngine.predictCheckoutTime({
              checkinTime: checkinHours,
              historicalHours: historicalHours,
              dayOfWeek: attendanceDateObj.getDay(),
              transitionCount: Math.min(userAttendances.length, 5)
            }); // Calculate predicted checkout time
            checkoutTime = new Date(timeIn.getTime() + predictedDuration * 3600000);
            usedSmartPrediction = true;
            smartPredictionCount++;

            logger.info(
              `Smart prediction for attendance ${attendance.id_attendance}: ${predictedDuration.toFixed(2)}h (historical: ${historicalHours.toFixed(2)}h)`
            );
          } catch (smartError) {
            logger.warn(
              `Smart prediction failed for attendance ${attendance.id_attendance}, using fallback:`,
              smartError.message
            );

            // Fallback to standard time
            const [hours, minutes, seconds] = fallbackSetting.setting_value.split(':').map(Number);
            checkoutTime = new Date(attendanceDate + 'T00:00:00.000Z');
            checkoutTime.setUTCHours(hours, minutes, seconds, 0);
            const jakartaCheckoutTime = new Date(checkoutTime.getTime() + jakartaOffset * 60000);
            checkoutTime = jakartaCheckoutTime;
            fallbackCount++;
          }

          // Calculate work hour
          const timeIn = new Date(attendance.time_in);
          const workHour = calculateWorkHour(timeIn, checkoutTime);

          // Add auto checkout note with method indication
          const methodNote = usedSmartPrediction
            ? 'Sesi diakhiri otomatis oleh Smart Auto Checkout System.'
            : 'Sesi diakhiri otomatis oleh sistem (fallback).';

          const newNotes = attendance.notes ? attendance.notes + '\n' + methodNote : methodNote;

          // Update attendance record
          await attendance.update(
            {
              time_out: checkoutTime,
              work_hour: workHour,
              notes: newNotes,
              updated_at: new Date()
            },
            { transaction }
          );

          successCount++;
          logger.info(
            `Smart auto checkout successful for user ${attendance.user_id}, attendance ${attendance.id_attendance}, date: ${attendanceDate}, method: ${usedSmartPrediction ? 'Smart' : 'Fallback'}`
          );
        } catch (error) {
          errorCount++;
          logger.error(
            `Smart auto checkout failed for user ${attendance.user_id}, attendance ${attendance.id_attendance}:`,
            error.message
          );
        }
      }

      await transaction.commit();

      const result = {
        success: true,
        setting_created: created,
        smart_checkout_enabled: true,
        fallback_time: fallbackSetting.setting_value,
        past_records_processed: pendingAttendances.length,
        success_count: successCount,
        error_count: errorCount,
        smart_prediction_count: smartPredictionCount,
        fallback_count: fallbackCount,
        engine_info:
          'Smart Auto Checkout menggunakan Fuzzy AHP untuk prediksi waktu pulang yang realistis'
      };

      logger.info(`Smart auto checkout setup completed!`);
      logger.info(`Past dates processed: Success: ${successCount}, Errors: ${errorCount}`);
      logger.info(`Smart predictions: ${smartPredictionCount}, Fallback: ${fallbackCount}`);

      res.status(200).json({
        success: true,
        message:
          'Konfigurasi Smart Auto Checkout berhasil diatur dan data masa lalu telah diproses.',
        data: result
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Error setting up smart auto checkout configuration:', error);
    next(error);
  }
};

/**
 * Process all past attendance records using smart auto checkout (without changing settings)
 */
export const processPastAttendances = async (req, res, next) => {
  try {
    // Only allow admins to process past attendances
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message:
          'Akses ditolak. Hanya admin dan manajemen yang dapat memproses data attendance masa lalu.'
      });
    }

    logger.info('Processing all past attendance records with smart auto checkout...');

    // Check if smart checkout is enabled
    const smartSetting = await Settings.findOne({
      where: { setting_key: 'checkout.smart_enabled' }
    });

    // Get fallback time setting
    const fallbackSetting = await Settings.findOne({
      where: { setting_key: 'checkout.fallback_time' }
    });

    const fallbackTime = fallbackSetting?.setting_value || '17:00:00';

    // Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const currentDate = new Date(now.getTime() + jakartaOffset * 60000).toISOString().split('T')[0];

    // Find all attendance records that need auto checkout
    const pendingAttendances = await Attendance.findAll({
      where: {
        time_out: null,
        attendance_date: {
          [Op.lt]: currentDate // Only past dates
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name']
        }
      ]
    });

    logger.info(`Found ${pendingAttendances.length} past attendance records to process`);

    let successCount = 0;
    let errorCount = 0;
    let smartPredictionCount = 0;
    let fallbackCount = 0;

    for (const attendance of pendingAttendances) {
      try {
        const attendanceDate = attendance.attendance_date;
        let checkoutTime;
        let usedSmartPrediction = false;

        // Try smart prediction if enabled
        if (smartSetting?.setting_value === 'true') {
          try {
            // Get user's historical work pattern
            const oneMonthAgo = new Date(attendanceDate);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            const userAttendances = await Attendance.findAll({
              where: {
                user_id: attendance.user_id,
                attendance_date: {
                  [Op.between]: [oneMonthAgo.toISOString().split('T')[0], attendanceDate]
                },
                time_in: { [Op.not]: null },
                time_out: { [Op.not]: null }
              },
              limit: 15
            });

            if (userAttendances.length >= 2) {
              const totalHours = userAttendances.reduce((sum, att) => {
                const tIn = new Date(att.time_in);
                const tOut = new Date(att.time_out);
                const hours = (tOut - tIn) / (1000 * 60 * 60);
                return sum + (hours > 0 && hours <= 16 ? hours : 8);
              }, 0);
              const historicalHours = totalHours / userAttendances.length;
              const timeIn = new Date(attendance.time_in);
              const checkinHours = timeIn.getHours() + timeIn.getMinutes() / 60;
              const attendanceDateObj = new Date(attendanceDate);

              // Get smart prediction using imported function
              const predictedDuration = await fuzzyEngine.predictCheckoutTime({
                checkinTime: checkinHours,
                historicalHours: historicalHours,
                dayOfWeek: attendanceDateObj.getDay(),
                transitionCount: Math.min(userAttendances.length, 5)
              });

              checkoutTime = new Date(timeIn.getTime() + predictedDuration * 3600000);
              usedSmartPrediction = true;
              smartPredictionCount++;
            }
          } catch (smartError) {
            logger.warn(
              `Smart prediction failed for attendance ${attendance.id_attendance}:`,
              smartError.message
            );
          }
        }

        // Fallback to traditional method if smart prediction not available or failed
        if (!usedSmartPrediction) {
          const [hours, minutes, seconds] = fallbackTime.split(':').map(Number);
          checkoutTime = new Date(attendanceDate + 'T00:00:00.000Z');
          checkoutTime.setUTCHours(hours, minutes, seconds, 0);
          const jakartaCheckoutTime = new Date(checkoutTime.getTime() + jakartaOffset * 60000);
          checkoutTime = jakartaCheckoutTime;
          fallbackCount++;
        }

        // Calculate work hour
        const timeIn = new Date(attendance.time_in);
        const workHour = calculateWorkHour(timeIn, checkoutTime);

        // Add auto checkout note
        const methodNote = usedSmartPrediction
          ? 'Sesi diakhiri otomatis oleh Smart Auto Checkout System.'
          : 'Sesi diakhiri otomatis oleh sistem (fallback).';

        const newNotes = attendance.notes ? attendance.notes + '\n' + methodNote : methodNote;

        await attendance.update({
          time_out: checkoutTime,
          work_hour: workHour,
          notes: newNotes,
          updated_at: new Date()
        });

        successCount++;
        logger.info(
          `Smart auto checkout successful for attendance ${attendance.id_attendance}, date: ${attendanceDate}, method: ${usedSmartPrediction ? 'Smart' : 'Fallback'}`
        );
      } catch (error) {
        errorCount++;
        logger.error(
          `Smart auto checkout failed for attendance ${attendance.id_attendance}:`,
          error.message
        );
      }
    }

    const result = {
      success: true,
      total_processed: pendingAttendances.length,
      success_count: successCount,
      error_count: errorCount,
      smart_prediction_count: smartPredictionCount,
      fallback_count: fallbackCount,
      smart_enabled: smartSetting?.setting_value === 'true',
      fallback_time: fallbackTime
    };

    logger.info(
      `Smart past attendance processing completed. Success: ${successCount}, Errors: ${errorCount}`
    );
    logger.info(`Smart predictions: ${smartPredictionCount}, Fallback: ${fallbackCount}`);

    res.status(200).json({
      success: true,
      message:
        'Pemrosesan data attendance masa lalu dengan Smart Auto Checkout berhasil completed.',
      data: result
    });
  } catch (error) {
    logger.error('Error processing past attendances with smart checkout:', error);
    next(error);
  }
};

/**
 * Manual trigger for resolve unused WFA bookings job (Admin only)
 * This endpoint allows admins to manually trigger the WFA bookings resolver
 * for testing purposes or to handle missed daily runs
 */
export const manualResolveWfaBookings = async (req, res, next) => {
  try {
    // Only allow admins to trigger manual resolve
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message:
          'Akses ditolak. Hanya admin dan manajemen yang dapat menjalankan resolve WFA bookings secara manual.'
      });
    }

    const result = await triggerResolveWfaBookings();

    res.status(200).json({
      success: true,
      message: 'Resolve unused WFA bookings job berhasil dijalankan secara manual.',
      data: result
    });
  } catch (error) {
    logger.error('Error in manual resolve WFA bookings:', error);
    next(error);
  }
};

/**
 * Manual trigger for create general alpha records job (Admin only)
 * This endpoint allows admins to manually trigger the general alpha creator
 * for testing purposes or to handle missed daily runs
 */
export const manualCreateGeneralAlpha = async (req, res, next) => {
  try {
    // Only allow admins to trigger manual alpha creation
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message:
          'Akses ditolak. Hanya admin dan manajemen yang dapat menjalankan pembuatan alpha records secara manual.'
      });
    }

    const result = await triggerCreateGeneralAlpha();

    res.status(200).json({
      success: true,
      message: 'Create general alpha records job berhasil dijalankan secara manual.',
      data: result
    });
  } catch (error) {
    logger.error('Error in manual create general alpha:', error);
    next(error);
  }
};

/**
 * Log location event - lightweight endpoint for recording geofence enter/exit events
 * This endpoint is designed to be fast and efficient for passive Android app tracking
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const logLocationEvent = async (req, res, next) => {
  try {
    const { event_type, location_id, event_timestamp } = req.body;
    const user_id = req.user.id; // Get user_id from verified JWT token

    logger.info(
      `Logging location event for user ${user_id}: ${event_type} at location ${location_id}`
    );

    // Verify that the location exists before creating the event
    const location = await Location.findByPk(location_id);
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location ID tidak valid',
        error: 'INVALID_LOCATION_ID'
      });
    }

    // Create the location event record
    const locationEvent = await LocationEvent.create({
      user_id,
      location_id,
      event_type,
      event_timestamp: new Date(event_timestamp)
    });

    logger.info(`Location event created successfully: ID ${locationEvent.id}`);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Location event berhasil dicatat',
      data: {
        event_id: locationEvent.id,
        user_id: locationEvent.user_id,
        location_id: locationEvent.location_id,
        event_type: locationEvent.event_type,
        event_timestamp: locationEvent.event_timestamp,
        recorded_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in logLocationEvent:', error);

    // Return appropriate error response
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Data tidak valid',
        error: 'VALIDATION_ERROR',
        details: error.errors.map((err) => err.message)
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Location ID tidak ditemukan',
        error: 'FOREIGN_KEY_CONSTRAINT'
      });
    }

    next(error);
  }
};

/**
 * Get smart checkout prediction for a user (Admin/Management only)
 * This endpoint provides intelligent checkout time prediction based on Fuzzy AHP
 */
export const getSmartCheckoutPrediction = async (req, res, next) => {
  try {
    // Only allow admins to access smart prediction
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya admin dan manajemen yang dapat mengakses smart prediction.'
      });
    }
    const { checkinTime, historicalHours = 8.0, dayOfWeek, transitionCount } = req.body;

    // Validate required parameters (for testing endpoint)
    if (checkinTime === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Parameter checkinTime wajib diisi.'
      });
    }

    if (typeof checkinTime !== 'number' || checkinTime < 0 || checkinTime > 24) {
      return res.status(400).json({
        success: false,
        message: 'checkinTime harus berupa angka antara 0-24.'
      });
    }

    // Use provided historicalHours or default to 8.0 for testing
    const testHistoricalHours = typeof historicalHours === 'number' ? historicalHours : 8.0;
    // Get AHP weights
    const ahpWeights = fuzzyEngine.getCheckoutPredictionAhpWeights();

    // Get prediction from smart engine
    const prediction = await fuzzyEngine.predictCheckoutTime(
      {
        checkinTime: checkinTime,
        historicalHours: testHistoricalHours,
        dayOfWeek: dayOfWeek || new Date().getDay(),
        transitionCount: transitionCount || 3
      },
      ahpWeights
    );

    // Calculate predicted checkout time
    const checkinDate = new Date();
    checkinDate.setHours(Math.floor(checkinTime), (checkinTime % 1) * 60, 0, 0);
    const predictedCheckoutTime = new Date(checkinDate.getTime() + prediction * 3600000);

    res.status(200).json({
      success: true,
      data: {
        input: {
          checkinTime: checkinTime,
          historicalHours: testHistoricalHours,
          dayOfWeek: dayOfWeek || new Date().getDay(),
          transitionCount: transitionCount || 3
        },
        prediction: {
          predictedDuration: prediction,
          method: 'Fuzzy AHP Engine'
        },
        predicted_checkout_time: predictedCheckoutTime.toISOString(),
        predicted_duration_hours: prediction.toFixed(2),
        methodology: {
          engine: 'Fuzzy AHP',
          weights_used: ahpWeights
        },
        note: 'This is a testing endpoint with provided or default parameters'
      }
    });
  } catch (error) {
    logger.error('Error getting smart checkout prediction:', error);
    next(error);
  }
};

/**
 * Get smart checkout engine configuration and weights (Admin/Management only)
 */
export const getSmartEngineConfig = async (req, res, next) => {
  try {
    // Only allow admins to access configuration
    if (req.user.role_name !== 'Admin' && req.user.role_name !== 'Management') {
      return res.status(403).json({
        success: false,
        message:
          'Akses ditolak. Hanya admin dan manajemen yang dapat mengakses konfigurasi smart checkout.'
      });
    } // Get weights from imported function
    const weights = fuzzyEngine.getCheckoutPredictionAhpWeights();

    res.status(200).json({
      success: true,
      data: {
        ahp_weights: weights,
        fuzzy_sets: {
          checkin_time: ['pagi', 'siang', 'sore'],
          historical_hours: ['pendek', 'normal', 'panjang'],
          transition_count: ['rendah', 'sedang', 'tinggi'],
          day_of_week: ['awal_minggu', 'tengah_minggu', 'akhir_minggu'],
          output_duration: ['pendek', 'normal', 'panjang']
        },
        criteria_definitions: {
          checkin_time: 'Waktu check-in dalam format jam (0-24)',
          historical_pattern: 'Rata-rata jam kerja historis pengguna',
          day_context: 'Konteks hari dalam seminggu (0=Minggu, 6=Sabtu)',
          transition_factor: 'Frekuensi perpindahan lokasi/mobilitas'
        },
        methodology: 'Fuzzy Inference System dengan AHP weighting',
        engine_version: '2.0 - Unified Fuzzy AHP Engine',
        consistency_ratio: weights.consistency_ratio,
        is_consistent: weights.consistency_ratio <= 0.1,
        description:
          'Smart Checkout menggunakan Fuzzy AHP untuk prediksi waktu pulang yang realistis'
      }
    });
  } catch (error) {
    logger.error('Error getting smart checkout configuration:', error);
    next(error);
  }
};

/**
 * Enhanced auto checkout settings with smart prediction preview
 */
export const getEnhancedAutoCheckoutSettings = async (req, res, next) => {
  try {
    // Get the auto checkout time setting from database
    const autoTimeSetting = await Settings.findOne({
      where: {
        setting_key: 'checkout.auto_time'
      }
    });

    // Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const currentTimeString = jakartaTime.toISOString().substring(11, 19);
    const currentDate = jakartaTime.toISOString().split('T')[0];

    // Find active attendances (checked in but not checked out)
    const activeAttendances = await Attendance.findAll({
      where: {
        attendance_date: currentDate,
        time_out: null
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name', 'nip_nim']
        }
      ]
    });

    // Generate smart predictions for active attendances
    const smartPredictions = [];
    for (const attendance of activeAttendances) {
      try {
        const timeIn = new Date(attendance.time_in);
        const checkinHours = timeIn.getHours() + timeIn.getMinutes() / 60;

        // Get user's historical pattern
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const userAttendances = await Attendance.findAll({
          where: {
            user_id: attendance.user_id,
            attendance_date: {
              [Op.gte]: oneMonthAgo.toISOString().split('T')[0]
            },
            time_in: { [Op.not]: null },
            time_out: { [Op.not]: null }
          },
          limit: 10
        });

        let historicalHours = 8.0;
        if (userAttendances.length > 0) {
          const totalHours = userAttendances.reduce((sum, att) => {
            const tIn = new Date(att.time_in);
            const tOut = new Date(att.time_out);
            const hours = (tOut - tIn) / (1000 * 60 * 60);
            return sum + hours;
          }, 0);
          historicalHours = totalHours / userAttendances.length;
        } // Get smart prediction using imported function
        const predictedDuration = await fuzzyEngine.predictCheckoutTime({
          checkinTime: checkinHours,
          historicalHours: historicalHours,
          dayOfWeek: new Date().getDay(),
          transitionCount: 3
        });

        const predictedCheckoutTime = new Date(timeIn.getTime() + predictedDuration * 3600000);
        smartPredictions.push({
          attendance_id: attendance.id_attendance,
          user_id: attendance.user_id,
          user_name: attendance.user?.full_name,
          time_in: formatTimeOnly(attendance.time_in),
          predicted_checkout: formatTimeOnly(predictedCheckoutTime),
          predicted_duration: predictedDuration.toFixed(2),
          historical_avg: historicalHours.toFixed(2)
        });
      } catch (error) {
        logger.error(
          `Error generating prediction for attendance ${attendance.id_attendance}:`,
          error
        );
        smartPredictions.push({
          attendance_id: attendance.id_attendance,
          user_id: attendance.user_id,
          user_name: attendance.user?.full_name,
          time_in: formatTimeOnly(attendance.time_in),
          prediction_error: 'Failed to generate prediction'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        auto_checkout_time: autoTimeSetting?.setting_value || 'Not configured',
        current_jakarta_time: currentTimeString,
        current_date: currentDate,
        active_attendances_count: activeAttendances.length,
        smart_predictions: smartPredictions,
        traditional_checkouts: activeAttendances.map((att) => ({
          id_attendance: att.id_attendance,
          user_id: att.user_id,
          user_name: att.user?.full_name,
          time_in: formatTimeOnly(att.time_in),
          attendance_date: att.attendance_date,
          traditional_checkout: autoTimeSetting?.setting_value || '17:00:00'
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting enhanced auto checkout settings:', error);
    next(error);
  }
};
