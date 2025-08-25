/*
  Test runner for Smart Auto Checkout (FAHP + DOW)
  Usage:
    node scripts/test-smart-auto-checkout.js 2025-08-25
  If date arg is omitted, defaults to H-1 in Asia/Jakarta.
*/

import('../src/models/index.js').then(async (m) => {
  const { Attendance } = m;
  const { runSmartAutoCheckoutForDate } = await import('../src/jobs/autoCheckout.job.js');

  try {
    const arg = process.argv[2];
    const now = new Date();
    const jkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const y = new Date(jkt);
    y.setDate(jkt.getDate() - 1);
    const defaultDate = y.toISOString().split('T')[0];
    const targetDate = (arg || '').trim() || defaultDate;

    console.log(`[TEST] Smart Auto Checkout for targetDate=${targetDate}`);

    // Snapshot before
    const before = await Attendance.findAll({
      where: { attendance_date: targetDate },
      attributes: ['id_attendance', 'user_id', 'time_in', 'time_out', 'work_hour', 'category_id']
    });
    const openBefore = before.filter((a) => a.time_in && !a.time_out).length;
    console.log(`[TEST] Open sessions before: ${openBefore} / total ${before.length}`);

    await runSmartAutoCheckoutForDate(targetDate);

    // Snapshot after
    const after = await Attendance.findAll({
      where: { attendance_date: targetDate },
      attributes: ['id_attendance', 'user_id', 'time_in', 'time_out', 'work_hour', 'notes']
    });
    const filled = after.filter((a) => a.time_out).length;
    const stillOpen = after.filter((a) => a.time_in && !a.time_out).length;

    // Heuristic counts
    const smart = after.filter((a) => (a.notes || '').includes('Auto checkout (smart)')).length;
    const fallback = after.filter((a) =>
      (a.notes || '').includes('Auto checkout (fallback)')
    ).length;

    console.log('[RESULT]');
    console.log(
      JSON.stringify(
        {
          targetDate,
          totalAttendances: after.length,
          filledTimeOut: filled,
          stillOpen,
          smartUsed: smart,
          fallbackUsed: fallback
        },
        null,
        2
      )
    );

    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
});
