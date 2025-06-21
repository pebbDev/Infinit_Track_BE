import { Op } from 'sequelize';

import { Settings } from '../models/index.js';

/**
 * Helper function to get attendance settings from database
 * @param {Array} settingKeys - Array of setting keys to retrieve
 * @param {Transaction} transaction - Optional database transaction
 * @returns {Object} Settings object with key-value pairs
 */
export const getAttendanceSettings = async (settingKeys = [], transaction = null) => {
  try {
    // Default setting keys if none provided
    const defaultKeys = [
      'attendance.checkin.start_time',
      'attendance.checkin.end_time',
      'attendance.checkin.late_time',
      'workday.holiday_checkin_enabled',
      'workday.weekend_checkin_enabled',
      'workday.holiday_region'
    ];

    const keysToFetch = settingKeys.length > 0 ? settingKeys : defaultKeys;

    const settings = await Settings.findAll({
      where: {
        setting_key: {
          [Op.in]: keysToFetch
        }
      },
      transaction
    });

    // Convert settings array to object for easy access
    const settingsMap = {};
    settings.forEach((setting) => {
      settingsMap[setting.setting_key] = setting.setting_value;
    });

    // Set default values if settings not found
    return {
      checkinStartTime: settingsMap['attendance.checkin.start_time'] || '08:00:00',
      checkinEndTime: settingsMap['attendance.checkin.end_time'] || '18:00:00',
      checkinLateTime: settingsMap['attendance.checkin.late_time'] || '09:00:00',
      holidayCheckinEnabled: settingsMap['workday.holiday_checkin_enabled'] === 'true',
      weekendCheckinEnabled: settingsMap['workday.weekend_checkin_enabled'] === 'true',
      holidayRegion: settingsMap['workday.holiday_region'] || 'ID'
    };
  } catch (error) {
    throw new Error(`Failed to get attendance settings: ${error.message}`);
  }
};

/**
 * Helper function to get Jakarta timezone date
 * @returns {Object} Object containing localTime and todayDate
 */
export const getJakartaTime = () => {
  const today = new Date();
  const jakartaOffset = 7 * 60; // UTC+7 dalam menit
  const localTime = new Date(today.getTime() + jakartaOffset * 60000);
  const todayDate = localTime.toISOString().split('T')[0]; // YYYY-MM-DD format

  return {
    localTime,
    todayDate
  };
};

/**
 * Helper function to convert time string to minutes
 * @param {string} timeString - Time in format "HH:MM:SS" or "HH:MM"
 * @returns {number} Total minutes
 */
export const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Helper function to check if current time is within working hours
 * @param {Date} currentTime - Current time
 * @param {string} startTime - Start time in format "HH:MM:SS"
 * @param {string} endTime - End time in format "HH:MM:SS"
 * @returns {boolean} True if within working hours
 */
export const isWithinWorkingHours = (currentTime, startTime, endTime) => {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
};

/**
 * Helper function to determine attendance status (ontime vs late)
 * @param {Date} currentTime - Current time
 * @param {string} lateTime - Late time threshold in format "HH:MM:SS"
 * @returns {number} Status ID (1 = ontime, 2 = late)
 */
export const determineAttendanceStatus = (currentTime, lateTime) => {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const lateTimeMinutes = timeToMinutes(lateTime);

  return currentTimeMinutes > lateTimeMinutes ? 2 : 1; // 2 = late, 1 = ontime
};
