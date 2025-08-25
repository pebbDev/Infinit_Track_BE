import { sequelize, Attendance } from '../src/models/index.js';
import { runSmartAutoCheckoutForDate } from '../src/jobs/autoCheckout.job.js';
import { triggerCreateGeneralAlpha } from '../src/jobs/createGeneralAlpha.job.js';
import { triggerResolveWfaBookings } from '../src/jobs/resolveWfaBookings.job.js';

function getH1DateString() {
  const now = new Date();
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const jkt = new Date(now.getTime() + jakartaOffsetMs);
  const y = new Date(jkt);
  y.setDate(jkt.getDate() - 1);
  return y.toISOString().split('T')[0];
}

async function countAlpha(dateStr) {
  return Attendance.count({ where: { attendance_date: dateStr, status_id: 3 } });
}

async function countOpenSessions(dateStr) {
  return Attendance.count({
    where: {
      attendance_date: dateStr,
      time_in: { $not: null },
      time_out: null
    }
  });
}

async function main() {
  const targetDate = process.env.TARGET_DATE || getH1DateString();
  console.log(`\n=== TEST: Auto Checkout + Alpha for date ${targetDate} ===`);

  // Baselines
  const alphaBefore = await countAlpha(targetDate);
  const openBefore = await countOpenSessions(targetDate);
  console.log(`Baseline - alpha: ${alphaBefore}, open sessions: ${openBefore}`);

  // 1) Smart Auto Checkout for H-1
  console.log('Running Smart Auto Checkout (FAHP + DOW)...');
  await runSmartAutoCheckoutForDate(targetDate);
  const openAfterAC = await countOpenSessions(targetDate);
  console.log(`After Auto Checkout - open sessions: ${openAfterAC}`);

  // 2) General Alpha (working days only)
  console.log('Running General Alpha job (H-1, working days)...');
  await triggerCreateGeneralAlpha();
  const alphaAfterGeneral = await countAlpha(targetDate);
  console.log(
    `After General Alpha - alpha: ${alphaAfterGeneral} (delta ${alphaAfterGeneral - alphaBefore})`
  );

  // 3) WFA Alpha (all days)
  console.log('Running WFA Alpha resolver (H-1, all days)...');
  await triggerResolveWfaBookings();
  const alphaAfterWfa = await countAlpha(targetDate);
  console.log(
    `After WFA Alpha - alpha: ${alphaAfterWfa} (delta ${alphaAfterWfa - alphaAfterGeneral})`
  );

  console.log('\nSummary:');
  console.log(`  targetDate: ${targetDate}`);
  console.log(`  alpha_before: ${alphaBefore}`);
  console.log(`  alpha_after:  ${alphaAfterWfa}`);
  console.log(`  open_before:  ${openBefore}`);
  console.log(`  open_after:   ${openAfterAC}`);
}

main()
  .catch((err) => {
    console.error('Test runner error:', err);
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {}
    process.exit(0);
  });
