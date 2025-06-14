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
  Role
} from '../models/index.js';
import { calculateDistance } from '../utils/geofence.js';
import { formatWorkHour, calculateWorkHour, formatTimeOnly } from '../utils/workHourFormatter.js';
import { applySearch } from '../utils/searchHelper.js';
import { triggerAutoCheckout } from '../jobs/autoCheckout.js';
import { triggerResolveWfaBookings } from '../jobs/resolveWfaBookings.job.js';
import { triggerCreateGeneralAlpha } from '../jobs/createGeneralAlpha.job.js';
import {
  setupAutoCheckoutAndProcessPastDates,
  processAllPastAttendances
} from '../utils/setupAutoCheckout.js';
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
    const { page = 1, limit = 5 } = req.query;

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query with rich response includes
    const attendanceData = await Attendance.findAndCountAll({
      where: { user_id: userId },
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
    }); // Transform data response
    const transformedData = attendanceData.rows.map((att) => {
      return {
        id_attendance: att.id_attendance,
        attendance_date: att.attendance_date,
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
    const { category_id, latitude, longitude, notes = '', booking_id } = req.body; // Definisikan "Hari Ini" dengan timezone Asia/Jakarta
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
    const todayDate = localTime.toISOString().split('T')[0]; // YYYY-MM-DD format

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
    const holidayRegion = settingsMap['workday.holiday_region'] || 'ID'; // 3. Validasi Hari Libur
    const hd = new Holidays(holidayRegion);
    const isHoliday = hd.isHoliday(localTime);
    const isWeekend = localTime.getDay() === 0 || localTime.getDay() === 6;

    if ((isHoliday && !holidayCheckinEnabled) || (isWeekend && !weekendCheckinEnabled)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Check-in tidak diizinkan pada hari libur.'
      });
    } // 4. Validasi Jam Kerja
    // Calculate time using proper Jakarta timezone - parse from ISO string
    const jakartaTimeISO = localTime.toISOString();
    const currentHour = parseInt(jakartaTimeISO.substring(11, 13));
    const currentMinute = parseInt(jakartaTimeISO.substring(14, 16));
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
    } // 6. Determine Attendance Status (ontime vs late)
    const lateTimeMinutes =
      parseInt(lateTime.split(':')[0]) * 60 + parseInt(lateTime.split(':')[1]);
    const statusId = currentTimeMinutes > lateTimeMinutes ? 2 : 1; // 2 = late, 1 = ontime

    // 7. Save Data to Database
    const attendanceData = {
      user_id: userId,
      category_id: category_id,
      status_id: statusId,
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

    // 8. Send Success Response (HTTP 201 Created)
    res.status(201).json({
      success: true,
      data: newAttendance,
      message: 'Check-in berhasil'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Debug endpoint untuk troubleshooting check-in time validation
export const debugCheckInTime = async (req, res) => {
  try {
    // Get current Jakarta time
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
    const todayDate = localTime.toISOString().split('T')[0];

    // Simple test first
    const testHour = parseInt(localTime.toISOString().substring(11, 13));
    const testMinute = parseInt(localTime.toISOString().substring(14, 16));

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
    // Parse the hours and minutes from the ISO string of adjusted time
    const jakartaTimeISO = localTime.toISOString();
    const currentHour = parseInt(jakartaTimeISO.substring(11, 13));
    const currentMinute = parseInt(jakartaTimeISO.substring(14, 16));
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    console.log('DEBUG TIMEZONE:');
    console.log('today (UTC):', today.toISOString());
    console.log('localTime (Jakarta):', localTime.toISOString());
    console.log('jakartaTimeISO:', jakartaTimeISO);
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

    // Definisikan "Hari Ini" dengan timezone Asia/Jakarta
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
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
    // Calculate time using proper Jakarta timezone - parse from ISO string
    const jakartaTimeISO = localTime.toISOString();
    const currentHour = parseInt(jakartaTimeISO.substring(11, 13));
    const currentMinute = parseInt(jakartaTimeISO.substring(14, 16));
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
    const can_check_out = currentAttendance && !currentAttendance.time_out;

    // Bentuk respons
    const response = {
      success: true,
      data: {
        can_check_in,
        can_check_out,
        checked_in_at: currentAttendance ? formatTimeOnly(currentAttendance.time_in) : null,
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
    const timeOut = new Date(now.getTime() + jakartaOffset * 60000);
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
 * Setup auto checkout configuration and process all past attendance records
 * This endpoint will:
 * 1. Create/update the checkout.auto_time setting in database
 * 2. Process all past attendance records that haven't been checked out
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

    const result = await setupAutoCheckoutAndProcessPastDates();

    res.status(200).json({
      success: true,
      message: 'Konfigurasi auto checkout berhasil diatur dan data masa lalu telah diproses.',
      data: result
    });
  } catch (error) {
    logger.error('Error setting up auto checkout configuration:', error);
    next(error);
  }
};

/**
 * Process all past attendance records for auto checkout (without changing settings)
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

    const result = await processAllPastAttendances();

    res.status(200).json({
      success: true,
      message: 'Pemrosesan data attendance masa lalu berhasil completed.',
      data: result
    });
  } catch (error) {
    logger.error('Error processing past attendances:', error);
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
