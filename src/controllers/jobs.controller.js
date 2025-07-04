import { triggerCreateGeneralAlpha } from '../jobs/createGeneralAlpha.job.js';
import { triggerResolveWfaBookings } from '../jobs/resolveWfaBookings.job.js';
import { triggerAutoCheckout } from '../jobs/autoCheckout.job.js';
import logger from '../utils/logger.js';

/**
 * Trigger Create General Alpha job manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const triggerGeneralAlpha = async (req, res) => {
  try {
    logger.info('API trigger: Create General Alpha job requested', {
      triggeredBy: req.user?.id || 'unknown',
      userRole: req.user?.role?.role_name || 'unknown',
      timestamp: new Date().toISOString()
    });

    const result = await triggerCreateGeneralAlpha();

    logger.info('API trigger: Create General Alpha job completed successfully', {
      result,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.json({
      success: true,
      message: 'Create General Alpha job executed successfully',
      data: result,
      executedAt: new Date().toISOString(),
      triggeredBy: {
        userId: req.user?.id || null,
        userRole: req.user?.role?.role_name || null
      }
    });
  } catch (error) {
    logger.error('API trigger: Create General Alpha job failed', {
      error: error.message,
      stack: error.stack,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to execute Create General Alpha job',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Trigger Resolve WFA Bookings job manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const triggerWfaBookings = async (req, res) => {
  try {
    logger.info('API trigger: Resolve WFA Bookings job requested', {
      triggeredBy: req.user?.id || 'unknown',
      userRole: req.user?.role?.role_name || 'unknown',
      timestamp: new Date().toISOString()
    });

    const result = await triggerResolveWfaBookings();

    logger.info('API trigger: Resolve WFA Bookings job completed successfully', {
      result,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.json({
      success: true,
      message: 'Resolve WFA Bookings job executed successfully',
      data: result,
      executedAt: new Date().toISOString(),
      triggeredBy: {
        userId: req.user?.id || null,
        userRole: req.user?.role?.role_name || null
      }
    });
  } catch (error) {
    logger.error('API trigger: Resolve WFA Bookings job failed', {
      error: error.message,
      stack: error.stack,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to execute Resolve WFA Bookings job',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Trigger Smart Auto Checkout job manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const triggerSmartAutoCheckout = async (req, res) => {
  try {
    logger.info('API trigger: Smart Auto Checkout job requested', {
      triggeredBy: req.user?.id || 'unknown',
      userRole: req.user?.role?.role_name || 'unknown',
      timestamp: new Date().toISOString()
    });

    const result = await triggerAutoCheckout();

    logger.info('API trigger: Smart Auto Checkout job completed successfully', {
      result,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.json({
      success: true,
      message: 'Smart Auto Checkout job executed successfully',
      data: result,
      executedAt: new Date().toISOString(),
      triggeredBy: {
        userId: req.user?.id || null,
        userRole: req.user?.role?.role_name || null
      }
    });
  } catch (error) {
    logger.error('API trigger: Smart Auto Checkout job failed', {
      error: error.message,
      stack: error.stack,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to execute Smart Auto Checkout job',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Trigger all jobs in sequence
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const triggerAllJobs = async (req, res) => {
  try {
    logger.info('API trigger: All jobs requested in sequence', {
      triggeredBy: req.user?.id || 'unknown',
      userRole: req.user?.role?.role_name || 'unknown',
      timestamp: new Date().toISOString()
    });

    const results = {
      generalAlpha: null,
      wfaBookings: null,
      autoCheckout: null,
      errors: []
    };

    // Execute jobs in the same order as scheduled cron jobs
    try {
      logger.info('Executing General Alpha job...');
      results.generalAlpha = await triggerCreateGeneralAlpha();
    } catch (error) {
      results.errors.push({ job: 'generalAlpha', error: error.message });
      logger.error('General Alpha job failed during bulk execution', error);
    }

    try {
      logger.info('Executing Resolve WFA Bookings job...');
      results.wfaBookings = await triggerResolveWfaBookings();
    } catch (error) {
      results.errors.push({ job: 'wfaBookings', error: error.message });
      logger.error('Resolve WFA Bookings job failed during bulk execution', error);
    }

    try {
      logger.info('Executing Smart Auto Checkout job...');
      results.autoCheckout = await triggerAutoCheckout();
    } catch (error) {
      results.errors.push({ job: 'autoCheckout', error: error.message });
      logger.error('Smart Auto Checkout job failed during bulk execution', error);
    }

    const hasErrors = results.errors.length > 0;
    const successCount = [results.generalAlpha, results.wfaBookings, results.autoCheckout].filter(
      (result) => result !== null
    ).length;

    logger.info('API trigger: All jobs execution completed', {
      successCount,
      errorCount: results.errors.length,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.status(hasErrors ? 207 : 200).json({
      success: !hasErrors,
      message: hasErrors
        ? `${successCount} jobs completed successfully, ${results.errors.length} jobs failed`
        : 'All jobs executed successfully',
      data: {
        results,
        summary: {
          totalJobs: 3,
          successfulJobs: successCount,
          failedJobs: results.errors.length
        }
      },
      executedAt: new Date().toISOString(),
      triggeredBy: {
        userId: req.user?.id || null,
        userRole: req.user?.role?.role_name || null
      }
    });
  } catch (error) {
    logger.error('API trigger: All jobs execution failed completely', {
      error: error.message,
      stack: error.stack,
      triggeredBy: req.user?.id || 'unknown'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to execute jobs',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get status of all cron jobs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getJobsStatus = async (req, res) => {
  try {
    // Get current Jakarta time
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7 in minutes
    const jakartaTime = new Date(now.getTime() + jakartaOffset * 60000);
    const todayDate = jakartaTime.toISOString().split('T')[0];

    const status = {
      server: {
        currentTime: new Date().toISOString(),
        jakartaTime: jakartaTime.toISOString(),
        todayDate: todayDate,
        serverUptime: process.uptime()
      },
      jobs: {
        generalAlpha: {
          name: 'Create General Alpha',
          schedule: '45 23 * * 1-5 (Mon-Fri at 23:45 WIB)',
          description: 'Creates alpha records for users with no attendance',
          lastManualTrigger: null // Could be enhanced to track this
        },
        wfaBookings: {
          name: 'Resolve WFA Bookings',
          schedule: '50 23 * * * (Daily at 23:50 WIB)',
          description: 'Processes unused WFA bookings and expired requests',
          lastManualTrigger: null
        },
        autoCheckout: {
          name: 'Smart Auto Checkout',
          schedule: '55 23 * * * (Daily at 23:55 WIB)',
          description: 'Performs intelligent auto-checkout using Fuzzy AHP',
          lastManualTrigger: null
        }
      },
      manualTriggers: {
        available: true,
        endpoints: {
          triggerGeneralAlpha: 'POST /api/jobs/trigger/general-alpha',
          triggerWfaBookings: 'POST /api/jobs/trigger/wfa-bookings',
          triggerAutoCheckout: 'POST /api/jobs/trigger/auto-checkout',
          triggerAllJobs: 'POST /api/jobs/trigger/all'
        },
        requirements: {
          authentication: 'Bearer token required',
          authorization: 'Admin role required',
          note: 'All triggers are logged for audit purposes'
        }
      }
    };

    res.json({
      success: true,
      message: 'Cron jobs status retrieved successfully',
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get jobs status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve jobs status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
