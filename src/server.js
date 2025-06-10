import app from './app.js';
import config from './config/index.js';
import sequelize from './config/database.js';
import logger from './utils/logger.js';
import { startAutoCheckoutJob } from './jobs/autoCheckout.js';
import { startResolveWfaBookingsJob } from './jobs/resolveWfaBookings.job.js';
import { startCreateGeneralAlphaJob } from './jobs/createGeneralAlpha.job.js';

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully'); // Inisialisasi dan jalankan auto checkout job setelah database terhubung
    startAutoCheckoutJob();

    // Inisialisasi dan jalankan resolve WFA bookings job
    startResolveWfaBookingsJob();

    // Inisialisasi dan jalankan create general alpha job
    startCreateGeneralAlphaJob();
  } catch (err) {
    logger.error('Database connection failed:', err.message);
    logger.warn('Server will start without database connection');
  }

  app.listen(config.port, () => {
    logger.info(`Server 🚀 on port ${config.port}`);
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📚 API Documentation: http://localhost:${config.port}/docs`);
  });
})();
