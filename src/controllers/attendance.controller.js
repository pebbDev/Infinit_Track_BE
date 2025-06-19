import { Op } from 'sequelize';
import Holidays from 'date-holidays';

import {
  Attendance,
  Booking,
  Location,
  Settings,
  AttendanceCategory,
  BookingStatus
} from '../models/index.js';

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
    const { page = 1, limit = 10 } = req.query;

    const attendance = await Attendance.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      attendance: attendance.rows,
      total: attendance.count,
      page: parseInt(page),
      totalPages: Math.ceil(attendance.count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Konstanta untuk lokasi WFO (Work From Office)
const WFO_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  radius: 100,
  description: 'Kantor Pusat Jakarta',
  address: 'Jl. Sudirman No. 1, Jakarta Pusat'
};

export const getAttendanceStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Definisikan "Hari Ini" dengan timezone Asia/Jakarta
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
    const todayDate = localTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Ambil pengaturan dari database
    const settings = await Settings.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'checkin.start_time',
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
    });

    // Set default values jika setting tidak ditemukan
    const checkinStartTime = settingsMap['checkin.start_time'] || '08:00:00';
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
    });

    // Tentukan active_mode dan active_location
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
      active_mode = 'Work From Office';
      active_location = {
        location_id: null,
        latitude: WFO_LOCATION.latitude,
        longitude: WFO_LOCATION.longitude,
        radius: WFO_LOCATION.radius,
        description: WFO_LOCATION.description,
        address: WFO_LOCATION.address,
        category: 'Work From Office'
      };
    }

    // Tentukan waktu check-in yang diizinkan (08:00 - 18:00)
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const checkinStartMinutes =
      parseInt(checkinStartTime.split(':')[0]) * 60 + parseInt(checkinStartTime.split(':')[1]);
    const checkoutAutoMinutes =
      parseInt(checkoutAutoTime.split(':')[0]) * 60 + parseInt(checkoutAutoTime.split(':')[1]);

    // Tentukan can_check_in
    const can_check_in =
      (!isHolidayOrWeekend || holidayCheckinEnabled) &&
      !currentAttendance &&
      currentTimeMinutes >= checkinStartMinutes &&
      currentTimeMinutes <= checkoutAutoMinutes;

    // Tentukan can_check_out
    const can_check_out = currentAttendance && !currentAttendance.time_out;

    // Bentuk respons
    const response = {
      success: true,
      data: {
        can_check_in,
        can_check_out,
        checked_in_at: currentAttendance ? currentAttendance.time_in : null,
        active_mode,
        active_location,
        today_date: todayDate,
        is_holiday: isHolidayOrWeekend,
        holiday_checkin_enabled: holidayCheckinEnabled,
        current_time: localTime.toISOString(),
        checkin_window: {
          start_time: checkinStartTime,
          end_time: checkoutAutoTime
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
