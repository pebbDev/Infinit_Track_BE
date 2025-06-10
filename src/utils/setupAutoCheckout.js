import { Op } from 'sequelize';

import sequelize from '../config/database.js';
import { Attendance, Settings } from '../models/index.js';

import { calculateWorkHour } from './workHourFormatter.js';
import logger from './logger.js';

/**
 * Setup auto checkout configuration and process past dates
 */
export const setupAutoCheckoutAndProcessPastDates = async () => {
  const transaction = await sequelize.transaction();

  try {
    logger.info('Setting up auto checkout configuration...');

    // 1. Insert or update the auto checkout time setting
    const [setting, created] = await Settings.findOrCreate({
      where: { setting_key: 'checkout.auto_time' },
      defaults: {
        setting_key: 'checkout.auto_time',
        setting_value: '17:00:00',
        description: 'Waktu otomatis checkout untuk pengguna yang lupa checkout',
        updated_at: new Date()
      },
      transaction
    });

    if (!created) {
      await setting.update(
        {
          setting_value: '17:00:00',
          updated_at: new Date()
        },
        { transaction }
      );
    }

    logger.info(
      `Auto checkout time setting ${created ? 'created' : 'updated'}: ${setting.setting_value}`
    );

    // 2. Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const currentDate = jakartaTime.toISOString().split('T')[0];

    logger.info(`Processing auto checkout for dates before: ${currentDate}`);

    // 3. Find all attendance records that need auto checkout (past dates)
    const pendingAttendances = await Attendance.findAll({
      where: {
        time_out: null, // Not yet checked out
        attendance_date: {
          [Op.lt]: currentDate // Only past dates (not today)
        }
      },
      transaction
    });

    logger.info(`Found ${pendingAttendances.length} past attendance records to auto checkout`);

    let successCount = 0;
    let errorCount = 0;

    // 4. Process each attendance record
    for (const attendance of pendingAttendances) {
      try {
        const attendanceDate = attendance.attendance_date;

        // Set checkout time to 17:00:00 on the attendance date
        const [hours, minutes, seconds] = setting.setting_value.split(':').map(Number);

        // Create checkout time for the specific date
        const checkoutTime = new Date(attendanceDate + 'T00:00:00.000Z');
        checkoutTime.setUTCHours(hours, minutes, seconds, 0);

        // Convert to Jakarta time
        const jakartaCheckoutTime = new Date(checkoutTime.getTime() + jakartaOffset * 60000);

        // Calculate work hour
        const timeIn = new Date(attendance.time_in);
        const workHour = calculateWorkHour(timeIn, jakartaCheckoutTime);

        // Add auto checkout note
        const newNotes = attendance.notes
          ? attendance.notes + '\nSesi diakhiri otomatis oleh sistem.'
          : 'Sesi diakhiri otomatis oleh sistem.';

        // Update attendance record
        await attendance.update(
          {
            time_out: jakartaCheckoutTime,
            work_hour: workHour,
            notes: newNotes,
            updated_at: new Date()
          },
          { transaction }
        );

        successCount++;
        logger.info(
          `Auto checkout successful for user ${attendance.user_id}, attendance ${attendance.id_attendance}, date: ${attendanceDate}`
        );
      } catch (error) {
        errorCount++;
        logger.error(
          `Auto checkout failed for user ${attendance.user_id}, attendance ${attendance.id_attendance}:`,
          error.message
        );
      }
    }

    await transaction.commit();

    logger.info(`Auto checkout setup completed!`);
    logger.info(`Configuration: Auto checkout time set to ${setting.setting_value}`);
    logger.info(`Past dates processed: Success: ${successCount}, Errors: ${errorCount}`);

    return {
      success: true,
      setting_created: created,
      setting_value: setting.setting_value,
      past_records_processed: pendingAttendances.length,
      success_count: successCount,
      error_count: errorCount
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error setting up auto checkout:', error.message);
    throw error;
  }
};

/**
 * Manual trigger to process past attendance records only
 */
export const processAllPastAttendances = async () => {
  try {
    logger.info('Processing all past attendance records for auto checkout...');

    // Get auto checkout time setting
    const autoTimeSetting = await Settings.findOne({
      where: { setting_key: 'checkout.auto_time' }
    });

    if (!autoTimeSetting) {
      throw new Error(
        'Auto checkout time setting not found. Run setupAutoCheckoutAndProcessPastDates first.'
      );
    }

    const autoTime = autoTimeSetting.setting_value;

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
      }
    });

    logger.info(`Found ${pendingAttendances.length} past attendance records to process`);

    let successCount = 0;
    let errorCount = 0;

    for (const attendance of pendingAttendances) {
      try {
        const attendanceDate = attendance.attendance_date;

        // Set checkout time to auto time on the attendance date
        const [hours, minutes, seconds] = autoTime.split(':').map(Number);
        const checkoutTime = new Date(attendanceDate + 'T00:00:00.000Z');
        checkoutTime.setUTCHours(hours, minutes, seconds, 0);
        const jakartaCheckoutTime = new Date(checkoutTime.getTime() + jakartaOffset * 60000);

        // Calculate work hour
        const timeIn = new Date(attendance.time_in);
        const workHour = calculateWorkHour(timeIn, jakartaCheckoutTime);

        // Add auto checkout note
        const newNotes = attendance.notes
          ? attendance.notes + '\nSesi diakhiri otomatis oleh sistem.'
          : 'Sesi diakhiri otomatis oleh sistem.';

        await attendance.update({
          time_out: jakartaCheckoutTime,
          work_hour: workHour,
          notes: newNotes,
          updated_at: new Date()
        });

        successCount++;
        logger.info(
          `Auto checkout successful for attendance ${attendance.id_attendance}, date: ${attendanceDate}`
        );
      } catch (error) {
        errorCount++;
        logger.error(
          `Auto checkout failed for attendance ${attendance.id_attendance}:`,
          error.message
        );
      }
    }

    logger.info(
      `Past attendance processing completed. Success: ${successCount}, Errors: ${errorCount}`
    );

    return {
      success: true,
      total_processed: pendingAttendances.length,
      success_count: successCount,
      error_count: errorCount
    };
  } catch (error) {
    logger.error('Error processing past attendances:', error.message);
    throw error;
  }
};

export default {
  setupAutoCheckoutAndProcessPastDates,
  processAllPastAttendances
};
