console.log('AutoCheckout job: Starting file execution...');

import cron from 'node-cron';
import { Op } from 'sequelize';

import { Attendance, Settings, LocationEvent, User } from '../models/index.js';
import { calculateWorkHour } from '../utils/workHourFormatter.js';
import fuzzyEngine from '../utils/fuzzyAhpEngine.js';
import logger from '../utils/logger.js';

console.log('AutoCheckout job: All imports loaded successfully');

export const startAutoCheckoutJob = () => {
  console.log('AutoCheckout job: startAutoCheckoutJob function defined');
  logger.info(
    'Smart Auto Checkout job scheduled to run daily at 23:55 with Enhanced Fuzzy AHP prediction'
  );
  cron.schedule('55 23 * * *', runAutoCheckout, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });
  logger.info('Smart Auto Checkout cron job has been initialized');
};

export const triggerAutoCheckout = async () => {
  console.log('AutoCheckout job: triggerAutoCheckout function defined');
  logger.info('Manual trigger: Smart Auto Checkout job with Enhanced Fuzzy AHP prediction');
  const result = await runAutoCheckout();
  return {
    success: true,
    message: 'Smart Auto Checkout job completed successfully',
    timestamp: new Date().toISOString(),
    methodology: 'Enhanced Fuzzy AHP Prediction Engine',
    details: result
  };
};

console.log('AutoCheckout job: All exports defined successfully');

/**
 * Main function to perform Smart automatic checkout using Enhanced Fuzzy AHP prediction
 */
const runAutoCheckout = async () => {
  console.log('AutoCheckout job: runAutoCheckout function called');
  try {
    logger.info('Starting Smart automatic checkout job with Enhanced Fuzzy AHP prediction...');

    const now = new Date();
    const jakartaOffset = 7 * 60;
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0];

    logger.info(`Processing smart automatic checkout for date: ${todayDate}`);

    const incompleteAttendances = await Attendance.findAll({
      where: {
        attendance_date: todayDate,
        time_out: null
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name']
        }
      ]
    });

    logger.info(`Found ${incompleteAttendances.length} attendance records without checkout`);

    if (incompleteAttendances.length === 0) {
      logger.info('No users require automatic checkout');
      return {
        total_processed: 0,
        successful_checkouts: 0,
        failed_checkouts: 0,
        completion_rate: '100%',
        methodology: 'Enhanced Fuzzy AHP Prediction Engine'
      };
    }

    let successCount = 0;
    let errorCount = 0;
    const processedUsers = [];

    const ahpWeights = fuzzyEngine.getCheckoutPredictionAhpWeights();
    logger.info('Using Enhanced Fuzzy AHP weights for checkout prediction:', ahpWeights);

    for (const attendance of incompleteAttendances) {
      try {
        const userId = attendance.user_id;
        const userName = attendance.user?.full_name || 'Unknown User';

        logger.info(`Processing checkout prediction for user ${userId} (${userName})`);

        const timeInDate = new Date(attendance.time_in);
        const checkinTimeHour = timeInDate.getHours() + timeInDate.getMinutes() / 60;

        // Get historical attendance data for the user (last 30 days)
        const historicalAttendances = await Attendance.findAll({
          where: {
            user_id: userId,
            time_out: { [Op.not]: null },
            work_hour: { [Op.not]: null },
            attendance_date: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        });

        // Calculate historical average work hours
        const historicalHours =
          historicalAttendances.length > 0
            ? historicalAttendances.reduce((sum, att) => sum + parseFloat(att.work_hour || 0), 0) /
              historicalAttendances.length
            : 8.0;

        // Get today's location transition count
        const transitionCount = await LocationEvent.count({
          where: {
            user_id: userId,
            created_at: {
              [Op.gte]: new Date(todayDate + 'T00:00:00Z'),
              [Op.lt]: new Date(todayDate + 'T23:59:59Z')
            }
          }
        });

        // Get day of week (1=Monday, 7=Sunday)
        const dayOfWeek = jakartaTime.getDay() === 0 ? 7 : jakartaTime.getDay();

        // Prepare daily context for prediction
        const dailyContext = {
          checkinTime: checkinTimeHour,
          historicalHours: historicalHours,
          transitionCount: transitionCount,
          dayOfWeek: dayOfWeek,
          userId: userId,
          userName: userName
        };

        logger.info(`Daily context for user ${userId}:`, dailyContext);

        // ==== ENHANCED FUZZY AHP PREDICTION ====
        const predictedDuration = await fuzzyEngine.predictCheckoutTime(dailyContext, ahpWeights);

        logger.info(
          `Predicted work duration for user ${userId}: ${predictedDuration.toFixed(2)} hours`
        );

        // Calculate predicted checkout time
        const predictedCheckoutTime = new Date(
          timeInDate.getTime() + predictedDuration * 60 * 60 * 1000
        );

        // Ensure checkout time doesn't exceed current time
        const finalCheckoutTime =
          predictedCheckoutTime > jakartaTime ? jakartaTime : predictedCheckoutTime;
        const checkoutTimeStr = finalCheckoutTime.toTimeString().split(' ')[0];

        // Calculate work hours
        const workHourCalculated = calculateWorkHour(attendance.time_in, checkoutTimeStr);

        // Update attendance record
        await Attendance.update(
          {
            time_out: checkoutTimeStr,
            work_hour: workHourCalculated,
            notes: attendance.notes
              ? `${attendance.notes} | Auto checkout (Enhanced Fuzzy AHP: ${predictedDuration.toFixed(2)}h)`
              : `Auto checkout using Enhanced Fuzzy AHP prediction (${predictedDuration.toFixed(2)}h predicted duration)`
          },
          {
            where: { id_attendance: attendance.id_attendance }
          }
        );

        processedUsers.push({
          user_id: userId,
          user_name: userName,
          predicted_duration: predictedDuration.toFixed(2),
          actual_checkout: checkoutTimeStr,
          work_hours: workHourCalculated,
          status: 'success'
        });

        logger.info(
          `✅ Smart checkout completed for user ${userId} (${userName}): ${checkoutTimeStr} (${workHourCalculated}h) - Prediction: ${predictedDuration.toFixed(2)}h`
        );

        successCount++;
      } catch (userError) {
        const userId = attendance.user_id;
        const userName = attendance.user?.full_name || 'Unknown User';

        logger.error(`❌ Error processing user ${userId}:`, userError);

        // Try fallback method
        try {
          const autoTimeSetting = await Settings.findOne({
            where: { setting_key: 'checkout.auto_time' }
          });

          const autoCheckoutTime = autoTimeSetting ? autoTimeSetting.setting_value : '17:00:00';
          const [hours, minutes, seconds] = autoCheckoutTime.split(':').map(Number);
          const checkoutDateTime = new Date(todayDate + 'T00:00:00.000Z');
          checkoutDateTime.setUTCHours(hours, minutes, seconds || 0, 0);
          const jakartaCheckoutTime = new Date(checkoutDateTime.getTime() + jakartaOffset * 60000);

          const timeIn = new Date(attendance.time_in);
          const workHour = calculateWorkHour(timeIn, jakartaCheckoutTime);

          await Attendance.update(
            {
              time_out: jakartaCheckoutTime,
              work_hour: workHour,
              notes: attendance.notes
                ? `${attendance.notes} | Auto checkout by system (fallback method)`
                : 'Auto checkout by system (fallback method due to prediction error)'
            },
            {
              where: { id_attendance: attendance.id_attendance }
            }
          );

          processedUsers.push({
            user_id: userId,
            user_name: userName,
            predicted_duration: 'fallback',
            actual_checkout: jakartaCheckoutTime.toTimeString().split(' ')[0],
            work_hours: workHour,
            status: 'fallback_success'
          });

          logger.info(`Fallback auto checkout successful for user ${userId} (${userName})`);
          successCount++;
        } catch (fallbackError) {
          logger.error(
            `Both smart and fallback checkout failed for user ${userId}:`,
            fallbackError
          );

          processedUsers.push({
            user_id: userId,
            user_name: userName,
            predicted_duration: 'error',
            actual_checkout: 'failed',
            work_hours: 0,
            status: 'failed',
            error: fallbackError.message
          });

          errorCount++;
        }
      }
    }

    const completionSummary = {
      total_processed: incompleteAttendances.length,
      successful_checkouts: successCount,
      failed_checkouts: errorCount,
      completion_rate: `${((successCount / incompleteAttendances.length) * 100).toFixed(1)}%`,
      methodology: 'Enhanced Fuzzy AHP Prediction Engine',
      timestamp: jakartaTime.toISOString(),
      processed_users: processedUsers
    };

    logger.info('✅ Smart Auto Checkout job completed successfully', completionSummary);

    return completionSummary;
  } catch (error) {
    logger.error('❌ Smart Auto Checkout job failed:', error);
    throw error;
  }
};
