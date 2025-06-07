/**
 * Utility functions for formatting work hours
 */

/**
 * Format work_hour from float to "HH:MM" format
 * @param {number} workHourFloat - Work hour as float (e.g., 8.5 = 8 hours 30 minutes)
 * @returns {string} Formatted time as "HH:MM" (e.g., "08:30")
 */
export const formatWorkHour = (workHourFloat) => {
  // Handle null, undefined, or negative values
  if (!workHourFloat || workHourFloat < 0) {
    return '00:00';
  }

  const totalHours = Math.abs(workHourFloat); // Ensure positive value
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);

  // Handle edge case where minutes might be 60 due to rounding
  if (minutes >= 60) {
    return `${String(hours + 1).padStart(2, '0')}:00`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Convert "HH:MM" format back to float hours
 * @param {string} timeString - Time in "HH:MM" format
 * @returns {number} Time as float hours
 */
export const parseWorkHour = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }

  const [hours, minutes] = timeString.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    return 0;
  }

  return hours + minutes / 60;
};

/**
 * Validate work hour calculation to prevent negative values
 * @param {Date} timeIn - Check-in time
 * @param {Date} timeOut - Check-out time
 * @returns {number} Work hours as float, guaranteed to be non-negative
 */
export const calculateWorkHour = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) {
    return 0;
  }

  const timeInMs = new Date(timeIn).getTime();
  const timeOutMs = new Date(timeOut).getTime();

  const workHourMs = timeOutMs - timeInMs;

  // Ensure non-negative result
  if (workHourMs < 0) {
    return 0;
  }

  // Convert to hours and round to 2 decimal places
  return Math.round((workHourMs / (1000 * 60 * 60)) * 100) / 100;
};

export default {
  formatWorkHour,
  parseWorkHour,
  calculateWorkHour
};
