/**
 * Script to seed WFO (Work From Office) location
 * Run this script to ensure the main office location exists in the database
 *
 * Usage: node src/utils/seed-wfo-location.js
 */

import sequelize from '../config/database.js';
import { Location } from '../models/index.js';

const seedWfoLocation = async () => {
  try {
    console.log('🌱 Starting WFO location seeding...');

    // Check if WFO location already exists
    const existingWfoLocation = await Location.findOne({
      where: {
        id_attendance_categories: 1, // WFO category
        user_id: null // General location not tied to specific user
      }
    });

    if (existingWfoLocation) {
      console.log('ℹ️ WFO location already exists:');
      console.log(`   - Location ID: ${existingWfoLocation.location_id}`);
      console.log(`   - Description: ${existingWfoLocation.description}`);
      console.log(`   - Latitude: ${existingWfoLocation.latitude}`);
      console.log(`   - Longitude: ${existingWfoLocation.longitude}`);
      console.log(`   - Radius: ${existingWfoLocation.radius}m`);
      return;
    }

    // Create WFO location
    const wfoLocation = await Location.create({
      user_id: null,
      id_attendance_categories: 1, // WFO category
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 100,
      description: 'Kantor Pusat Jakarta',
      address: 'Jl. Sudirman No. 1, Jakarta Pusat'
    });

    console.log('✅ WFO location created successfully:');
    console.log(`   - Location ID: ${wfoLocation.location_id}`);
    console.log(`   - Description: ${wfoLocation.description}`);
    console.log(`   - Latitude: ${wfoLocation.latitude}`);
    console.log(`   - Longitude: ${wfoLocation.longitude}`);
    console.log(`   - Radius: ${wfoLocation.radius}m`);
    console.log(`   - Address: ${wfoLocation.address}`);
  } catch (error) {
    console.error('❌ Error seeding WFO location:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedWfoLocation()
    .then(() => {
      console.log('🎉 WFO location seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 WFO location seeding failed:', error);
      process.exit(1);
    });
}

export default seedWfoLocation;
