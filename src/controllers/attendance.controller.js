import { Op } from 'sequelize';
import Holidays from 'date-holidays';

import sequelize from '../config/database.js';
import {
  Attendance,
  Booking,
  Location,
  Settings,
  AttendanceCategory,
  BookingStatus
} from '../models/index.js';
import { calculateDistance } from '../utils/geofence.js';

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

export const checkIn = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { category_id, latitude, longitude, notes = '', booking_id } = req.body;

    // Definisikan "Hari Ini" dengan timezone Asia/Jakarta
    const today = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 dalam menit
    const localTime = new Date(today.getTime() + jakartaOffset * 60000);
    const todayDate = localTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    // 1. Validasi Lapis Pertama - Cek Duplikasi
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
    }

    // 2. Ambil pengaturan dari database
    const settings = await Settings.findAll({
      where: {
        setting_key: {
          [Op.in]: [
            'attendance.checkin.start_time',
            'attendance.checkout.auto_time',
            'attendance.checkin.late_time',
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
    const checkinStartTime = settingsMap['attendance.checkin.start_time'] || '08:00:00';
    const checkoutAutoTime = settingsMap['attendance.checkout.auto_time'] || '17:00:00';
    const lateTime = settingsMap['attendance.checkin.late_time'] || '09:00:00';
    const holidayCheckinEnabled = settingsMap['workday.holiday_checkin_enabled'] === 'true';
    const weekendCheckinEnabled = settingsMap['workday.weekend_checkin_enabled'] === 'true';
    const holidayRegion = settingsMap['workday.holiday_region'] || 'ID';

    // 3. Validasi Hari Libur
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

    // 4. Validasi Jam Kerja
    const currentHour = localTime.getHours();
    const currentMinute = localTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const checkinStartMinutes =
      parseInt(checkinStartTime.split(':')[0]) * 60 + parseInt(checkinStartTime.split(':')[1]);
    const checkoutAutoMinutes =
      parseInt(checkoutAutoTime.split(':')[0]) * 60 + parseInt(checkoutAutoTime.split(':')[1]);

    if (currentTimeMinutes < checkinStartMinutes || currentTimeMinutes > checkoutAutoMinutes) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Check-in hanya bisa dilakukan pada jam kerja.'
      });
    }

    // 5. Validasi Geofencing berdasarkan category_id
    let locationId = null;
    let finalBookingId = null;

    if (category_id === 1) {
      // WFO
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        WFO_LOCATION.latitude,
        WFO_LOCATION.longitude
      );

      if (distance > WFO_LOCATION.radius) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Anda berada di luar radius lokasi yang diizinkan.'
        });
      }

      locationId = null; // WFO tidak memiliki location_id di database
    } else if (category_id === 2) {
      // WFH
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

      locationId = wfhLocation.location_id;
    } else if (category_id === 3) {
      // WFA
      if (!booking_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking ID wajib untuk WFA.'
        });
      }

      const booking = await Booking.findOne({
        where: {
          booking_id: booking_id,
          user_id: userId,
          schedule_date: todayDate,
          status: 1 // approved
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
          message: 'Booking tidak ditemukan atau belum disetujui.'
        });
      }

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

      locationId = booking.location.location_id;
      finalBookingId = booking_id;
    }

    // 6. Menentukan Status Kehadiran (ontime vs late)
    const lateTimeMinutes =
      parseInt(lateTime.split(':')[0]) * 60 + parseInt(lateTime.split(':')[1]);
    const statusId = currentTimeMinutes > lateTimeMinutes ? 2 : 1; // 2 = late, 1 = ontime

    // 7. Menyimpan Data ke Database
    const attendanceData = {
      user_id: userId,
      category_id: category_id,
      status_id: statusId,
      location_id: locationId,
      booking_id: finalBookingId,
      time_in: localTime,
      attendance_date: todayDate,
      notes: notes,
      created_at: localTime,
      updated_at: localTime
    };

    const newAttendance = await Attendance.create(attendanceData, { transaction });

    await transaction.commit();

    // 8. Kirim Respons Sukses
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
