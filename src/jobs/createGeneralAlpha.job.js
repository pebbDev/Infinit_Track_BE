import cron from 'node-cron';
import { Op } from 'sequelize';
import Holidays from 'date-holidays';

import { User, Role, Attendance, Booking } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Main function to create general alpha records for users who didn't check-in
 * This runs on working days and excludes Admin and Management roles
 */
const createGeneralAlphaRecords = async () => {
  try {
    logger.info('Starting create general alpha records job...');

    // Get current Jakarta time for today's date
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Initialize Indonesian holidays checker
    const hd = new Holidays('ID'); // Indonesia
    const isHoliday = hd.isHoliday(jakartaTime);
    const dayOfWeek = jakartaTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if today is a working day (Monday-Friday and not a holiday)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend || isHoliday) {
      logger.info(`Skipping alpha record creation - today is ${isWeekend ? 'weekend' : 'holiday'}`);
      return;
    }

    logger.info(`Processing general alpha records for working day: ${todayDate}`);

    // STEP A: Get all users who are required to attend (excluding Admin and Management)
    const requiredUsers = await User.findAll({
      attributes: ['id_users'],
      include: [
        {
          model: Role,
          as: 'role',
          where: {
            role_name: {
              [Op.notIn]: ['Admin', 'Management']
            }
          }
        }
      ],
      where: { deleted_at: null }
    });

    const requiredUserIds = requiredUsers.map((u) => u.id_users);

    if (requiredUserIds.length === 0) {
      logger.info('No users found that require attendance tracking');
      return;
    }

    logger.info(`Found ${requiredUserIds.length} users who are required to attend`);

    // STEP B: Get users who already have records for today

    // B1: Users who already checked in (have attendance record)
    const presentUsers = await Attendance.findAll({
      attributes: ['user_id'],
      where: {
        attendance_date: todayDate
      }
    });
    const presentUserIds = presentUsers.map((a) => a.user_id);

    // B2: Users who have approved WFA bookings for today
    const wfaUsers = await Booking.findAll({
      attributes: ['user_id'],
      where: {
        schedule_date: todayDate,
        status: 1 // approved status
      }
    });
    const wfaUserIds = wfaUsers.map((b) => b.user_id);

    // B3: Combine both lists into unique set
    const presentOrWfaUserIds = [...new Set([...presentUserIds, ...wfaUserIds])];

    logger.info(
      `Users with existing records: ${presentOrWfaUserIds.length} (${presentUserIds.length} checked-in, ${wfaUserIds.length} approved WFA)`
    );

    // STEP C: Determine who should get alpha status
    const alphaUserIds = requiredUserIds.filter((userId) => !presentOrWfaUserIds.includes(userId));

    if (alphaUserIds.length === 0) {
      logger.info(
        'No users need alpha records - all required users have attendance or approved WFA'
      );
      return;
    }

    logger.info(`Found ${alphaUserIds.length} users who need alpha records`);

    // STEP D: Create alpha records
    let alphaRecordsCreated = 0;
    let errorCount = 0;

    for (const userId of alphaUserIds) {
      try {
        // Double-check that user doesn't already have an attendance record
        const existingRecord = await Attendance.findOne({
          where: {
            user_id: userId,
            attendance_date: todayDate
          }
        });

        if (!existingRecord) {
          await Attendance.create({
            user_id: userId,
            attendance_date: todayDate,
            status_id: 3, // Alpha status
            category_id: 1, // Default to WFO
            location_id: null,
            booking_id: null,
            time_in: null,
            time_out: null,
            work_hour: 0,
            notes: 'Tidak ada data check-in terdeteksi oleh sistem.',
            created_at: jakartaTime,
            updated_at: jakartaTime
          });

          alphaRecordsCreated++;
          logger.info(`Created alpha record for user ID: ${userId}`);
        } else {
          logger.debug(`Skipping user ID: ${userId} - attendance record already exists`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`Error creating alpha record for user ID: ${userId} - ${error.message}`);
      }
    }

    logger.info(
      `Create general alpha records job completed. Alpha records created: ${alphaRecordsCreated}, Errors: ${errorCount}`
    );
  } catch (error) {
    logger.error('Error in create general alpha records job:', error.message, {
      stack: error.stack
    });
  }
};

/**
 * Initialize and start the cron job for creating general alpha records
 * Runs on working days (Monday-Friday) at 23:45 Jakarta time
 */
export const startCreateGeneralAlphaJob = () => {
  logger.info('Create General Alpha job scheduled to run on working days at 23:45');

  // Schedule cron job to run Monday-Friday at 23:45 Jakarta time
  cron.schedule('45 23 * * 1-5', createGeneralAlphaRecords, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });

  logger.info('Create General Alpha cron job has been initialized');
};

/**
 * Manual trigger function for testing purposes
 */
export const triggerCreateGeneralAlpha = async () => {
  logger.info('Manual trigger: Create general alpha records job');
  await createGeneralAlphaRecords();
  return {
    success: true,
    message: 'General alpha records creation completed',
    timestamp: new Date().toISOString()
  };
};
