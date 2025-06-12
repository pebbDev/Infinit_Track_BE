import cron from 'node-cron';

import { Attendance, Settings } from '../models/index.js';
import { calculateWorkHour } from '../utils/workHourFormatter.js';
import logger from '../utils/logger.js';

/**
 * Main function to perform automatic checkout for users who forgot to check out
 * This function runs at a specific time and checks for attendance records without time_out
 */
const runAutoCheckout = async () => {
  try {
    logger.info('Starting automatic checkout job...');

    // Get current Jakarta time for today's date
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Processing automatic checkout for date: ${todayDate}`);

    // Get auto checkout time from settings
    const autoTimeSetting = await Settings.findOne({
      where: {
        setting_key: 'attendance.checkout.auto_time'
      }
    });

    // Use setting value or fallback to default
    const autoCheckoutTime = autoTimeSetting ? autoTimeSetting.setting_value : '23:50:00';

    if (!autoTimeSetting) {
      logger.warn('Auto checkout time setting not found in database, using default: 23:50:00');
    }

    logger.info(`Auto checkout time from settings: ${autoCheckoutTime}`);

    // Find all attendance records for today that don't have time_out
    const incompleteAttendances = await Attendance.findAll({
      where: {
        attendance_date: todayDate,
        time_out: null
      }
    });

    logger.info(
      `Found ${incompleteAttendances.length} attendance records without checkout for today`
    );

    if (incompleteAttendances.length === 0) {
      logger.info('No users require automatic checkout');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each incomplete attendance
    for (const attendance of incompleteAttendances) {
      try {
        // Create checkout time using the setting value
        const [hours, minutes, seconds] = autoCheckoutTime.split(':').map(Number);
        const checkoutDateTime = new Date(todayDate);
        checkoutDateTime.setUTCHours(hours, minutes, seconds || 0, 0);

        // Convert to Jakarta time
        const jakartaCheckoutTime = new Date(checkoutDateTime.getTime() + jakartaOffset * 60000);

        // Calculate work hours
        const timeIn = new Date(attendance.time_in);
        const workHour = calculateWorkHour(timeIn, jakartaCheckoutTime);

        // Update attendance record
        await attendance.update({
          time_out: jakartaCheckoutTime,
          work_hour: workHour,
          notes: attendance.notes
            ? `${attendance.notes} Sesi diakhiri otomatis oleh sistem.`
            : 'Sesi diakhiri otomatis oleh sistem.',
          updated_at: jakartaTime
        });

        successCount++;
        logger.info(
          `Auto checkout successful for user ID: ${attendance.user_id}, attendance ID: ${attendance.id_attendance}`
        );
      } catch (error) {
        errorCount++;
        logger.error(
          `Auto checkout failed for user ID: ${attendance.user_id}, attendance ID: ${attendance.id_attendance} - ${error.message}`
        );
      }
    }

    logger.info(
      `Automatic checkout job completed. Successful checkouts: ${successCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    logger.error('Error in automatic checkout job:', error.message, {
      stack: error.stack
    });
  }
};

/**
 * Initialize and start the cron job for automatic checkout
 * Runs daily at 23:55 Jakarta time
 */
export const startAutoCheckoutJob = () => {
  logger.info('Auto Checkout job scheduled to run daily at 23:55');

  // Schedule cron job to run daily at 23:55 Jakarta time
  cron.schedule('55 23 * * *', runAutoCheckout, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });

  logger.info('Auto Checkout cron job has been initialized');
};

/**
 * Manual trigger function for testing purposes
 */
export const triggerAutoCheckout = async () => {
  logger.info('Manual trigger: Auto checkout job');
  await runAutoCheckout();
  return {
    success: true,
    message: 'Auto checkout job completed',
    timestamp: new Date().toISOString()
  };
};
