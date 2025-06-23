import cron from 'node-cron';
import { Op } from 'sequelize';

import { Attendance, Settings, LocationEvent } from '../models/index.js';
import { calculateWorkHour } from '../utils/workHourFormatter.js';
import { predictWorkDuration } from '../utils/smartCheckoutEngine.js';
import logger from '../utils/logger.js';

/**
 * Main function to perform Smart automatic checkout using Fuzzy AHP prediction
 * This function runs at a specific time and uses intelligent prediction for checkout times
 */
const runAutoCheckout = async () => {
  try {
    logger.info('Starting Smart automatic checkout job with Fuzzy AHP prediction...');

    // Get current Jakarta time for today's date
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Processing smart automatic checkout for date: ${todayDate}`);

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

    // Process each incomplete attendance with smart prediction
    for (const attendance of incompleteAttendances) {
      try {
        // Gather data for smart prediction
        const timeInDate = new Date(attendance.time_in);
        const checkinTimeHour = timeInDate.getHours() + timeInDate.getMinutes() / 60;

        // Get historical work hours for this user (last 30 days)
        const historicalAttendances = await Attendance.findAll({
          where: {
            user_id: attendance.user_id,
            time_out: { [Op.not]: null },
            work_hour: { [Op.not]: null },
            attendance_date: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        });

        const historicalHours =
          historicalAttendances.length > 0
            ? historicalAttendances.reduce((sum, att) => sum + parseFloat(att.work_hour || 0), 0) /
              historicalAttendances.length
            : 8.0; // Default 8 hours

        // Get transition count for today
        const transitionCount = await LocationEvent.count({
          where: {
            user_id: attendance.user_id,
            created_at: {
              [Op.gte]: new Date(todayDate + 'T00:00:00Z'),
              [Op.lt]: new Date(todayDate + 'T23:59:59Z')
            }
          }
        });

        const dayOfWeek = timeInDate.getDay(); // 0=Sunday, 6=Saturday

        // Prepare parameters for smart prediction
        const predictionParams = {
          checkinTime: checkinTimeHour,
          historicalHours: historicalHours,
          dayOfWeek: dayOfWeek,
          transitionCount: transitionCount
        };

        logger.info(
          `Smart prediction parameters for user ${attendance.user_id}:`,
          predictionParams
        );

        // Get smart prediction
        const prediction = await predictWorkDuration(predictionParams);

        // Calculate predicted checkout time
        const predictedCheckoutTime = new Date(
          timeInDate.getTime() + prediction.predictedDuration * 60 * 60 * 1000
        );

        // Ensure checkout time doesn't exceed current time
        const finalCheckoutTime =
          predictedCheckoutTime > jakartaTime ? jakartaTime : predictedCheckoutTime;

        // Calculate final work hours
        const finalWorkHours = (finalCheckoutTime - timeInDate) / (1000 * 60 * 60);

        // Create smart notes
        const smartNotes = attendance.notes
          ? `${attendance.notes} [Smart Auto Checkout - Prediksi: ${prediction.predictedDuration.toFixed(2)}h, Confidence: ${(prediction.confidence * 100).toFixed(1)}%, Metode: Fuzzy AHP]`
          : `Sesi diakhiri otomatis oleh sistem cerdas. [Prediksi: ${prediction.predictedDuration.toFixed(2)}h, Confidence: ${(prediction.confidence * 100).toFixed(1)}%, Metode: Fuzzy AHP]`;

        // Update attendance record with smart prediction
        await attendance.update({
          time_out: finalCheckoutTime,
          work_hour: finalWorkHours.toFixed(2),
          notes: smartNotes,
          updated_at: jakartaTime
        });

        successCount++;
        logger.info(`Smart auto checkout successful for user ${attendance.user_id}:`, {
          attendanceId: attendance.id_attendance,
          checkinTime: timeInDate.toISOString(),
          predictedCheckoutTime: finalCheckoutTime.toISOString(),
          actualWorkHours: finalWorkHours.toFixed(2),
          predictedDuration: prediction.predictedDuration.toFixed(2),
          confidence: (prediction.confidence * 100).toFixed(1) + '%',
          methodology: 'Fuzzy AHP Prediction'
        });
      } catch (error) {
        errorCount++;
        logger.error(
          `Smart auto checkout failed for user ${attendance.user_id}, falling back to simple method:`,
          error
        );

        // Fallback to simple method if smart prediction fails
        try {
          // Get auto checkout time from settings as fallback
          const autoTimeSetting = await Settings.findOne({
            where: {
              setting_key: 'attendance.checkout.auto_time'
            }
          });

          const autoCheckoutTime = autoTimeSetting ? autoTimeSetting.setting_value : '23:50:00';
          const [hours, minutes, seconds] = autoCheckoutTime.split(':').map(Number);
          const checkoutDateTime = new Date(todayDate);
          checkoutDateTime.setUTCHours(hours, minutes, seconds || 0, 0);
          const jakartaCheckoutTime = new Date(checkoutDateTime.getTime() + jakartaOffset * 60000);

          const timeIn = new Date(attendance.time_in);
          const workHour = calculateWorkHour(timeIn, jakartaCheckoutTime);

          await attendance.update({
            time_out: jakartaCheckoutTime,
            work_hour: workHour,
            notes: attendance.notes
              ? `${attendance.notes} [Auto checkout by system - Fallback method]`
              : 'Sesi diakhiri otomatis oleh sistem (fallback method).',
            updated_at: jakartaTime
          });

          logger.info(`Fallback auto checkout successful for user ${attendance.user_id}`);
        } catch (fallbackError) {
          logger.error(
            `Both smart and fallback checkout failed for user ${attendance.user_id}:`,
            fallbackError
          );
        }
      }
    }

    logger.info(
      `Smart automatic checkout job completed. Successful checkouts: ${successCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    logger.error('Error in smart automatic checkout job:', error.message, {
      stack: error.stack
    });
  }
};

/**
 * Initialize and start the cron job for Smart automatic checkout
 * Runs daily at 23:55 Jakarta time with Fuzzy AHP prediction
 */
export const startAutoCheckoutJob = () => {
  logger.info('Smart Auto Checkout job scheduled to run daily at 23:55 with Fuzzy AHP prediction');

  // Schedule cron job to run daily at 23:55 Jakarta time
  cron.schedule('55 23 * * *', runAutoCheckout, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });

  logger.info('Smart Auto Checkout cron job has been initialized');
};

/**
 * Manual trigger function for testing Smart Auto Checkout
 */
export const triggerAutoCheckout = async () => {
  logger.info('Manual trigger: Smart Auto Checkout job with Fuzzy AHP prediction');
  await runAutoCheckout();
  return {
    success: true,
    message: 'Smart Auto Checkout job completed',
    timestamp: new Date().toISOString(),
    methodology: 'Fuzzy AHP Prediction Engine'
  };
};
