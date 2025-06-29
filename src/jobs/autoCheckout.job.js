console.log('AutoCheckout job: Starting file execution...');

import cron from 'node-cron';
import { Op } from 'sequelize';

import { Attendance, Settings, LocationEvent } from '../models/index.js';
import { calculateWorkHour } from '../utils/workHourFormatter.js';
import fuzzyEngine from '../utils/fuzzyAhpEngine.js';
import logger from '../utils/logger.js';

console.log('AutoCheckout job: All imports loaded successfully');

export const startAutoCheckoutJob = () => {
  console.log('AutoCheckout job: startAutoCheckoutJob function defined');
  logger.info('Smart Auto Checkout job scheduled to run daily at 23:55 with Fuzzy AHP prediction');
  cron.schedule('55 23 * * *', runAutoCheckout, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });
  logger.info('Smart Auto Checkout cron job has been initialized');
};

export const triggerAutoCheckout = async () => {
  console.log('AutoCheckout job: triggerAutoCheckout function defined');
  logger.info('Manual trigger: Smart Auto Checkout job with Fuzzy AHP prediction');
  await runAutoCheckout();
  return {
    success: true,
    message: 'Smart Auto Checkout job completed',
    timestamp: new Date().toISOString(),
    methodology: 'Fuzzy AHP Prediction Engine'
  };
};

console.log('AutoCheckout job: All exports defined successfully');

/**
 * Main function to perform Smart automatic checkout using Fuzzy AHP prediction
 */
const runAutoCheckout = async () => {
  console.log('AutoCheckout job: runAutoCheckout function called');
  try {
    logger.info('Starting Smart automatic checkout job with Fuzzy AHP prediction...');

    const now = new Date();
    const jakartaOffset = 7 * 60;
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0];

    logger.info(`Processing smart automatic checkout for date: ${todayDate}`);

    const incompleteAttendances = await Attendance.findAll({
      where: {
        attendance_date: todayDate,
        time_out: null
      }
    });

    logger.info(`Found ${incompleteAttendances.length} attendance records without checkout`);

    if (incompleteAttendances.length === 0) {
      logger.info('No users require automatic checkout');
      return;
    }
    let successCount = 0;
    let errorCount = 0;

    const ahpWeights = fuzzyEngine.getCheckoutPredictionAhpWeights();
    logger.info('Using Fuzzy AHP weights for checkout prediction:', ahpWeights);

    for (const attendance of incompleteAttendances) {
      try {
        const timeInDate = new Date(attendance.time_in);
        const checkinTimeHour = timeInDate.getHours() + timeInDate.getMinutes() / 60;

        const historicalAttendances = await Attendance.findAll({
          where: {
            user_id: attendance.user_id,
            time_out: { [Op.not]: null },
            work_hour: { [Op.not]: null },
            attendance_date: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        });

        const historicalHours =
          historicalAttendances.length > 0
            ? historicalAttendances.reduce((sum, att) => sum + parseFloat(att.work_hour || 0), 0) /
              historicalAttendances.length
            : 8.0;

        const transitionCount = await LocationEvent.count({
          where: {
            user_id: attendance.user_id,
            created_at: {
              [Op.gte]: new Date(todayDate + 'T00:00:00Z'),
              [Op.lt]: new Date(todayDate + 'T23:59:59Z')
            }
          }
        });

        const dayOfWeek = timeInDate.getDay();

        const dailyContext = {
          checkinTime: checkinTimeHour,
          historicalHours: historicalHours,
          dayOfWeek: dayOfWeek,
          transitionCount: transitionCount
        };

        logger.info(`Smart prediction parameters for user ${attendance.user_id}:`, dailyContext);

        const predictedDuration = await fuzzyEngine.predictCheckoutTime(dailyContext, ahpWeights);

        const predictedCheckoutTime = new Date(
          timeInDate.getTime() + predictedDuration * 60 * 60 * 1000
        );

        const finalCheckoutTime =
          predictedCheckoutTime > jakartaTime ? jakartaTime : predictedCheckoutTime;
        const finalWorkHours = (finalCheckoutTime - timeInDate) / (1000 * 60 * 60);

        const smartNotes = attendance.notes
          ? `${attendance.notes} [Smart Auto Checkout - Prediksi: ${predictedDuration.toFixed(2)}h, Metode: Fuzzy AHP Engine]`
          : `Sesi diakhiri otomatis oleh Smart Checkout Engine. [Prediksi: ${predictedDuration.toFixed(2)}h, Metode: Fuzzy AHP]`;

        await attendance.update({
          time_out: finalCheckoutTime,
          work_hour: finalWorkHours.toFixed(2),
          notes: smartNotes,
          updated_at: jakartaTime
        });

        successCount++;
        logger.info(`Smart auto checkout successful for user ${attendance.user_id}:`, {
          attendanceId: attendance.id_attendance,
          predictedDuration: predictedDuration.toFixed(2),
          methodology: 'Fuzzy AHP Engine'
        });
      } catch (error) {
        errorCount++;
        logger.error(`Smart auto checkout failed for user ${attendance.user_id}:`, error);

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
      `Smart automatic checkout job completed. Success: ${successCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    logger.error('Error in smart automatic checkout job:', error.message);
  }
};
