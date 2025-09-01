import { sequelize, User, Location, Booking, Attendance } from '../src/models/index.js';

function getH1DateString() {
  const now = new Date();
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const jkt = new Date(now.getTime() + jakartaOffsetMs);
  const y = new Date(jkt);
  y.setDate(jkt.getDate() - 1);
  return y.toISOString().split('T')[0];
}

async function main() {
  const targetDate = process.env.TARGET_DATE || getH1DateString();
  console.log(`\n=== SEED: WFA booking approved with no attendance for ${targetDate} ===`);

  const t = await sequelize.transaction();
  try {
    let user = null;
    const userIdEnv = process.env.USER_ID ? parseInt(process.env.USER_ID, 10) : null;
    if (userIdEnv) {
      user = await User.findByPk(userIdEnv, { transaction: t });
    }
    if (!user) {
      // Find a user without attendance on target date
      const candidates = await User.findAll({
        attributes: ['id_users'],
        limit: 50,
        transaction: t
      });
      for (const cand of candidates) {
        const hasAtt = await Attendance.findOne({
          where: { user_id: cand.id_users, attendance_date: targetDate },
          transaction: t
        });
        if (!hasAtt) {
          user = cand;
          break;
        }
      }
    }
    if (!user) {
      console.log('No users found. Aborting seeding.');
      await t.rollback();
      return;
    }
    const userId = user.id_users;

    const existingAttendance = await Attendance.findOne({
      where: { user_id: userId, attendance_date: targetDate },
      transaction: t
    });
    if (existingAttendance) {
      console.log(
        `User ${userId} already has attendance on ${targetDate}. Pick another user or date.`
      );
      await t.rollback();
      return;
    }

    // Create a WFA location (category 3) for this booking
    const loc = await Location.create(
      {
        user_id: null,
        id_attendance_categories: 3,
        latitude: -6.2,
        longitude: 106.8,
        radius: 100,
        description: `Test WFA Location for ${targetDate}`
      },
      { transaction: t }
    );

    // Create approved WFA booking (status=1)
    const booking = await Booking.create(
      {
        user_id: userId,
        schedule_date: targetDate,
        location_id: loc.location_id,
        status: 1,
        notes: 'Test fixture: approved WFA for H-1 without attendance',
        created_at: new Date(),
        approved_by: null,
        processed_at: null,
        suitability_score: null,
        suitability_label: null,
        rejection_reason: null
      },
      { transaction: t }
    );

    await t.commit();
    console.log(
      `Seeded approved WFA booking ${booking.booking_id} for user ${userId} on ${targetDate}`
    );
  } catch (e) {
    await t.rollback();
    console.error('Seeding failed:', e.message || e);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {
      // noop: ignore close errors in seeder context
    }
  }
}

main();
