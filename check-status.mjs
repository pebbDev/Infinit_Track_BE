import { AttendanceStatus } from './src/models/index.js';

(async () => {
  try {
    const statuses = await AttendanceStatus.findAll();
    console.log('Available attendance statuses:');
    statuses.forEach((status) => {
      console.log(`ID: ${status.id_attendance_status}, Name: '${status.attendance_status_name}'`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
