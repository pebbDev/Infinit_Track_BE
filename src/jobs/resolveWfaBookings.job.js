import cron from 'node-cron';
import { Op } from 'sequelize';

import { Booking, Attendance } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Resolve unused WFA bookings and expired pending bookings
 * Task A: Create alpha records for unused approved WFA bookings
 * Task B: Reject expired pending bookings
 */
export const resolveWfaBookingsJob = async () => {
  try {
    logger.info('Starting resolve WFA bookings job...');

    // Get current Jakarta time for today's date
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Processing WFA bookings for date: ${todayDate}`);

    // TASK A: Handle unused approved WFA bookings for today
    await handleUnusedApprovedBookings(todayDate, jakartaTime);

    // TASK B: Handle expired pending bookings
    await handleExpiredPendingBookings(todayDate, jakartaTime);

    logger.info('Resolve WFA bookings job completed successfully');
  } catch (error) {
    logger.error('Error in resolve WFA bookings job:', error);
  }
};

/**
 * Task A: Create alpha records for approved WFA bookings that weren't used
 */
const handleUnusedApprovedBookings = async (todayDate, jakartaTime) => {
  try {
    logger.info('Task A: Processing unused approved WFA bookings...');

    // Find all approved WFA bookings for today
    const approvedBookings = await Booking.findAll({
      where: {
        schedule_date: todayDate,
        status: 1 // approved status
      }
    });

    logger.info(`Found ${approvedBookings.length} approved WFA bookings for today`);

    let alphaRecordsCreated = 0;
    let skippedBookings = 0;

    // Process each approved booking
    for (const booking of approvedBookings) {
      try {
        // Check if user has ANY attendance record for today (not just for this booking)
        const existingAttendance = await Attendance.findOne({
          where: {
            user_id: booking.user_id,
            attendance_date: todayDate
          }
        });

        if (!existingAttendance) {
          // No attendance record found for this user today, create alpha record
          await Attendance.create({
            user_id: booking.user_id,
            category_id: 3, // Work From Anywhere
            status_id: 3, // alpha status
            location_id: booking.location_id,
            booking_id: booking.booking_id,
            time_in: null,
            time_out: null,
            work_hour: 0,
            attendance_date: booking.schedule_date,
            notes: `Booking WFA (ID: ${booking.booking_id}) disetujui tetapi tidak digunakan.`,
            created_at: jakartaTime,
            updated_at: jakartaTime
          });

          alphaRecordsCreated++;
          logger.info(
            `Created alpha attendance record for unused booking ID: ${booking.booking_id}, user ID: ${booking.user_id}`
          );
        } else {
          // Attendance record already exists, skip
          skippedBookings++;
          logger.debug(
            `Skipping booking ID: ${booking.booking_id} - user already has attendance record`
          );
        }
      } catch (error) {
        logger.error(`Error processing booking ID: ${booking.booking_id} - ${error.message}`);
      }
    }

    logger.info(
      `Task A completed. Alpha records created: ${alphaRecordsCreated}, Skipped: ${skippedBookings}`
    );
  } catch (error) {
    logger.error('Error in Task A (unused approved bookings):', error);
  }
};

/**
 * Task B: Reject expired pending bookings
 */
const handleExpiredPendingBookings = async (todayDate, jakartaTime) => {
  try {
    logger.info('Task B: Processing expired pending bookings...');

    // Find all pending bookings with schedule_date < today
    const expiredBookings = await Booking.findAll({
      where: {
        schedule_date: {
          [Op.lt]: todayDate
        },
        status: 3 // pending status
      }
    });

    logger.info(`Found ${expiredBookings.length} expired pending bookings`);

    let rejectedBookings = 0;
    let errorCount = 0;

    // Process each expired booking
    for (const booking of expiredBookings) {
      try {
        await booking.update({
          status: 2, // rejected
          processed_at: jakartaTime,
          approved_by: null, // System rejection, no specific admin
          updated_at: jakartaTime
        });

        rejectedBookings++;
        logger.info(
          `Rejected expired booking ID: ${booking.booking_id}, schedule_date: ${booking.schedule_date}`
        );
      } catch (error) {
        errorCount++;
        logger.error(`Error rejecting booking ID: ${booking.booking_id} - ${error.message}`);
      }
    }

    logger.info(
      `Task B completed. Expired bookings rejected: ${rejectedBookings}, Errors: ${errorCount}`
    );
  } catch (error) {
    logger.error('Error in Task B (expired pending bookings):', error);
  }
};

/**
 * Start the cron job for resolving WFA bookings
 * Runs daily at 23:50 Jakarta time
 */
export const startResolveWfaBookingsJob = () => {
  logger.info('Resolve WFA Bookings job scheduled to run daily at 23:50');

  // Schedule cron job to run daily at 23:50 Jakarta time
  cron.schedule('50 23 * * *', resolveWfaBookingsJob, {
    scheduled: true,
    timezone: 'Asia/Jakarta'
  });

  logger.info('Resolve WFA Bookings cron job has been initialized');
};

/**
 * Manual trigger function for testing purposes
 * This function can be called manually to test the resolve logic
 */
export const triggerResolveWfaBookings = async () => {
  logger.info('Manual trigger: Resolve WFA bookings job');
  await resolveWfaBookingsJob();
  return {
    success: true,
    message: 'Resolve WFA bookings job executed manually',
    timestamp: new Date().toISOString()
  };
};
