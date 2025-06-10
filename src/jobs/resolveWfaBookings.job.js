import cron from 'node-cron';

import { Booking, Attendance } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Resolve unused WFA bookings by creating alpha attendance records
 * This function checks all approved WFA bookings for today and creates
 * alpha attendance records for those without any attendance record
 */
export const resolveUnusedWfaBookings = async () => {
  try {
    logger.info('Starting resolve unused WFA bookings job...');

    // Get current Jakarta time for today's date
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    logger.info(`Checking unused WFA bookings for date: ${todayDate}`);

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
        // Check if attendance record already exists for this booking
        const existingAttendance = await Attendance.findOne({
          where: {
            booking_id: booking.booking_id
          }
        });

        if (!existingAttendance) {
          // No attendance record found, create alpha record
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
            notes: 'Absensi alpha otomatis - booking WFA disetujui tetapi tidak digunakan',
            created_at: jakartaTime,
            updated_at: jakartaTime
          });

          alphaRecordsCreated++;
          logger.info(
            `Created alpha attendance record for booking ID: ${booking.booking_id}, user ID: ${booking.user_id}`
          );
        } else {
          // Attendance record already exists, skip
          skippedBookings++;
          logger.debug(
            `Skipping booking ID: ${booking.booking_id} - attendance record already exists`
          );
        }
      } catch (error) {
        logger.error(`Error processing booking ID: ${booking.booking_id} - ${error.message}`);
      }
    }

    logger.info(
      `Resolve unused WFA bookings job completed. Alpha records created: ${alphaRecordsCreated}, Skipped: ${skippedBookings}`
    );
  } catch (error) {
    logger.error('Error in resolve unused WFA bookings job:', error);
  }
};

/**
 * Start the cron job for resolving unused WFA bookings
 * Runs daily at 23:50 Jakarta time
 */
export const startResolveWfaBookingsJob = () => {
  logger.info('Resolve WFA Bookings job scheduled to run daily at 23:50');

  // Schedule cron job to run daily at 23:50 Jakarta time
  cron.schedule('50 23 * * *', resolveUnusedWfaBookings, {
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
  logger.info('Manual trigger: Resolve unused WFA bookings job');
  await resolveUnusedWfaBookings();
  return {
    success: true,
    message: 'Resolve unused WFA bookings job executed manually',
    timestamp: new Date().toISOString()
  };
};
