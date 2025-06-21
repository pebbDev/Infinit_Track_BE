// import { QueryInterface, DataTypes } from 'sequelize';

// /**
//  * Seeder for WFO (Work From Office) location
//  * This seeder creates the main office location record in the locations table
//  * with id_attendance_categories = 1 and user_id = null
//  */
// export const up = async (queryInterface) => {
//   try {
//     // Check if WFO location already exists
//     const existingWfoLocation = await queryInterface.sequelize.query(
//       `SELECT location_id FROM locations
//        WHERE id_attendance_categories = 1 AND user_id IS NULL
//        LIMIT 1`,
//       { type: queryInterface.sequelize.QueryTypes.SELECT }
//     );

//     if (existingWfoLocation.length === 0) {
//       // Insert WFO location data
//       await queryInterface.bulkInsert('locations', [
//         {
//           user_id: null,
//           id_attendance_categories: 1, // WFO category
//           latitude: -6.2088,
//           longitude: 106.8456,
//           radius: 100,
//           description: 'Kantor Pusat Jakarta',
//           address: 'Jl. Sudirman No. 1, Jakarta Pusat',
//           created_at: new Date(),
//           updated_at: new Date()
//         }
//       ]);

//       console.log('✅ WFO location seeded successfully');
//     } else {
//       console.log('ℹ️ WFO location already exists, skipping seeder');
//     }
//   } catch (error) {
//     console.error('❌ Error seeding WFO location:', error);
//     throw error;
//   }
// };

// export const down = async (queryInterface) => {
//   try {
//     // Remove WFO location
//     await queryInterface.bulkDelete('locations', {
//       id_attendance_categories: 1,
//       user_id: null
//     });

//     console.log('✅ WFO location seeder rolled back successfully');
//   } catch (error) {
//     console.error('❌ Error rolling back WFO location seeder:', error);
//     throw error;
//   }
// };
