import cron from 'node-cron';
import { Op } from 'sequelize';

import { Attendance, Settings } from '../models/index.js';
import { calculateWorkHour } from '../utils/workHourFormatter.js';
import logger from '../utils/logger.js';

/**
 * Automatic checkout job that runs every minute to check if users need to be automatically checked out
 * based on the checkout.auto_time setting from the database
 */

const autoCheckoutJob = async () => {
  try {
    logger.info('Starting automatic checkout job...');

    // Get the auto checkout time setting from database
    const autoTimeSetting = await Settings.findOne({
      where: {
        setting_key: 'checkout.auto_time'
      }
    });

    // Use default time if setting not found
    const autoTime = autoTimeSetting ? autoTimeSetting.setting_value : '17:00:00';

    if (!autoTimeSetting) {
      logger.warn('Auto checkout time setting not found in database, using default: 17:00:00');
    }

    // Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);

    // Format current time as HH:MM:SS for comparison
    const currentTimeString = jakartaTime.toISOString().substring(11, 19);
    const currentDate = jakartaTime.toISOString().split('T')[0];

    logger.info(`Current Jakarta time: ${currentTimeString}, Auto checkout time: ${autoTime}`);

    // Check if current time matches auto checkout time (within 1 minute window)
    const autoTimeMinutes = timeToMinutes(autoTime);
    const currentTimeMinutes = timeToMinutes(currentTimeString);

    // Auto checkout should happen within 1 minute of the set time OR process past dates
    const isAutoCheckoutTime = Math.abs(currentTimeMinutes - autoTimeMinutes) <= 1;

    if (isAutoCheckoutTime) {
      logger.info('Auto checkout time reached, processing automatic checkouts...');

      // Find all users who are checked in but haven't checked out (today and past dates)
      const activeAttendances = await Attendance.findAll({
        where: {
          time_out: null, // Not yet checked out
          attendance_date: {
            [Op.lte]: currentDate // Today or earlier dates
          }
        }
      });

      logger.info(`Found ${activeAttendances.length} active attendances to auto checkout`);

      let successCount = 0;
      let errorCount = 0;

      for (const attendance of activeAttendances) {
        try {
          // For past dates, set checkout time to the auto checkout time of that day
          let checkoutTime;
          const attendanceDate = attendance.attendance_date;

          if (attendanceDate === currentDate) {
            // Today - use current Jakarta time
            checkoutTime = jakartaTime;
          } else {
            // Past date - set checkout to auto time on that date
            const [hours, minutes, seconds] = autoTime.split(':').map(Number);
            checkoutTime = new Date(attendanceDate + 'T00:00:00.000Z');
            checkoutTime.setUTCHours(hours, minutes, seconds, 0);
            // Convert to Jakarta time
            checkoutTime = new Date(checkoutTime.getTime() + jakartaOffset * 60000);
          }

          // Perform automatic checkout for this user
          await performAutoCheckout(attendance, checkoutTime);
          successCount++;

          logger.info(
            `Auto checkout successful for user ${attendance.user_id}, attendance ${attendance.id_attendance}, date: ${attendanceDate}`
          );
        } catch (error) {
          errorCount++;
          logger.error(
            `Auto checkout failed for user ${attendance.user_id}, attendance ${attendance.id_attendance}:`,
            error
          );
        }
      }

      logger.info(`Auto checkout completed. Success: ${successCount}, Errors: ${errorCount}`);
    }
  } catch (error) {
    logger.error('Error in automatic checkout job:', error);
  }
};

/**
 * Perform automatic checkout for a specific attendance record
 * @param {Object} attendance - The attendance record to checkout
 * @param {Date} checkoutTime - The time to set as checkout time
 */
const performAutoCheckout = async (attendance, checkoutTime) => {
  const timeIn = new Date(attendance.time_in);
  const workHour = calculateWorkHour(timeIn, checkoutTime);

  await attendance.update({
    time_out: checkoutTime,
    work_hour: workHour
  });
};

/**
 * Convert time string (HH:MM:SS) to minutes since midnight
 * @param {string} timeString - Time in format "HH:MM:SS"
 * @returns {number} Minutes since midnight
 */
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Initialize and start the automatic checkout cron job
 * Runs every minute to check for auto checkout time
 */
export const startAutoCheckoutJob = () => {
  // Run every minute
  cron.schedule('* * * * *', autoCheckoutJob, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });

  logger.info('Automatic checkout job scheduled to run every minute');
};

/**
 * Manual trigger for automatic checkout (for testing purposes)
 */
export const triggerAutoCheckout = autoCheckoutJob;

export default {
  startAutoCheckoutJob,
  triggerAutoCheckout
};
