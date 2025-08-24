console.log('AutoCheckout job: Starting file execution...');

import cron from 'node-cron';
// import { Op } from 'sequelize';

import { Attendance, Settings, User } from '../models/index.js';
import logger from '../utils/logger.js';

const TOLERANCE_MIN = parseInt(process.env.LATE_CHECKOUT_TOLERANCE_MIN || '120', 10);
const DEFAULT_SHIFT_END = process.env.DEFAULT_SHIFT_END || '17:00:00';

export const startAutoCheckoutJob = () => {
  logger.info('Missed checkout flagger scheduled to run every 30 minutes');
  cron.schedule('*/30 * * * *', runMissedCheckoutFlagger, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });
};

export const triggerAutoCheckout = async () => {
  logger.info('Manual trigger: Missed checkout flagger');
  const result = await runMissedCheckoutFlagger();
  return {
    success: true,
    message: 'Missed checkout flagger completed',
    timestamp: new Date().toISOString(),
    details: result
  };
};

const runMissedCheckoutFlagger = async () => {
  try {
    const now = new Date();
    const jakartaOffset = 7 * 60;
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0];

    // Find attendances without checkout for today
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

    if (incompleteAttendances.length === 0) {
      logger.info('No open attendances to flag');
      return { total_processed: 0, flagged: 0 };
    }

    let flagged = 0;

    // Load fallback shift end from settings if available
    const fallbackSetting = await Settings.findOne({ where: { setting_key: 'checkout.fallback_time' } });
    const fallbackShiftEnd = fallbackSetting?.setting_value || DEFAULT_SHIFT_END;

    for (const attendance of incompleteAttendances) {
      try {
        // Determine shift end time (use fallback; extend here if per-user schedules are added)
        const [hh, mm, ss] = fallbackShiftEnd.split(':').map(Number);
        const shiftEnd = new Date(`${todayDate}T00:00:00.000Z`);
        shiftEnd.setUTCHours(hh, mm, ss || 0, 0);
        const shiftEndJakarta = new Date(shiftEnd.getTime() + jakartaOffset * 60000);

        const toleranceMs = TOLERANCE_MIN * 60 * 1000;
        const deadline = new Date(shiftEndJakarta.getTime() + toleranceMs);

        if (jakartaTime >= deadline) {
          // Only flag; do not auto set time_out
          const note = 'Flagged as likely missed checkout by system.';
          const newNotes = attendance.notes ? `${attendance.notes}\n${note}` : note;
          await attendance.update({ notes: newNotes, updated_at: new Date() });
          flagged++;
        }
      } catch (e) {
        logger.warn(`Failed to process attendance ${attendance.id_attendance}: ${e.message}`);
      }
    }

    logger.info(`Missed checkout flagger completed. Flagged: ${flagged}/${incompleteAttendances.length}`);
    return { total_processed: incompleteAttendances.length, flagged };
  } catch (error) {
    logger.error('Missed checkout flagger failed:', error);
    throw error;
  }
};
