/**
 * Test script untuk melihat bobot AHP Smart Auto Checkout
 * Menampilkan konfigurasi weights dan fuzzy sets yang digunakan
 */

import fuzzyEngine from './src/utils/fuzzyAhpEngine.js';

console.log('🔍 SMART AUTO CHECKOUT - BOBOT DAN KONFIGURASI\n');

// 1. Mendapatkan bobot AHP untuk Smart Auto Checkout
console.log('📊 BOBOT AHP UNTUK SMART AUTO CHECKOUT:');
console.log('=' .repeat(50));

const weights = fuzzyEngine.getCheckoutPredictionAhpWeights();

console.log(`📈 Historical Pattern (Pola Historis): ${(weights.historical_pattern * 100).toFixed(1)}%`);
console.log(`⏰ Checkin Time (Waktu Masuk): ${(weights.checkin_time * 100).toFixed(1)}%`);
console.log(`📅 Day Context (Konteks Hari): ${(weights.day_context * 100).toFixed(1)}%`);
console.log(`🔄 Transition Factor (Faktor Mobilitas): ${(weights.transition_factor * 100).toFixed(1)}%`);

console.log('\n🎯 PENJELASAN KRITERIA:');
console.log('=' .repeat(50));
console.log('• Historical Pattern: Rata-rata jam kerja historis user (paling berpengaruh)');
console.log('• Checkin Time: Jam berapa user check-in (pagi/siang/sore)');
console.log('• Day Context: Hari apa dalam seminggu (Senin-Jumat)');
console.log('• Transition Factor: Seberapa sering user berpindah lokasi');

console.log('\n🧠 FUZZY SETS YANG DIGUNAKAN:');
console.log('=' .repeat(50));
console.log('✓ Checkin Time: pagi (6-8-10), siang (9-11-13), sore (12-14-16)');
console.log('✓ Historical Hours: pendek (4-6-7), normal (6.5-8-9.5), panjang (9-10-12)');
console.log('✓ Transition Count: rendah (0-1-3), sedang (2-4-6), tinggi (5-10)');
console.log('✓ Day of Week: awal_minggu (1-2-3), tengah_minggu (2-3-4), akhir_minggu (4-5-6)');

console.log('\n🔬 CONTOH PREDIKSI:');
console.log('=' .repeat(50));

// Test dengan beberapa skenario
const testCases = [
  {
    name: 'User Rajin Pagi',
    input: { checkinTime: 7, historicalHours: 8.5, dayOfWeek: 2, transitionCount: 1 }
  },
  {
    name: 'User Fleksibel Siang',
    input: { checkinTime: 10, historicalHours: 7.5, dayOfWeek: 3, transitionCount: 4 }
  },
  {
    name: 'User Mobile Sore',
    input: { checkinTime: 14, historicalHours: 6.0, dayOfWeek: 5, transitionCount: 8 }
  }
];

for (const testCase of testCases) {
  try {
    const prediction = await fuzzyEngine.predictCheckoutTime(testCase.input, weights);
    console.log(`\n🎲 ${testCase.name}:`);
    console.log(`   Input: Masuk jam ${testCase.input.checkinTime}, historis ${testCase.input.historicalHours}h, hari ${testCase.input.dayOfWeek}, mobilitas ${testCase.input.transitionCount}`);
    console.log(`   Prediksi: ${prediction.toFixed(2)} jam kerja`);
    
    // Hitung jam pulang
    const checkinDate = new Date();
    checkinDate.setHours(Math.floor(testCase.input.checkinTime), (testCase.input.checkinTime % 1) * 60, 0, 0);
    const checkoutDate = new Date(checkinDate.getTime() + prediction * 3600000);
    console.log(`   Estimasi pulang: ${checkoutDate.getHours().toString().padStart(2, '0')}:${checkoutDate.getMinutes().toString().padStart(2, '0')}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

console.log('\n💡 CARA KERJA SISTEM:');
console.log('=' .repeat(50));
console.log('1. Sistem menganalisis pola historis user (bobot tertinggi 40%)');
console.log('2. Mempertimbangkan waktu check-in (bobot 25%)');
console.log('3. Menyesuaikan dengan hari dalam seminggu (bobot 20%)');
console.log('4. Menghitung faktor mobilitas/perpindahan (bobot 15%)');
console.log('5. Menggunakan 41 aturan fuzzy untuk prediksi akhir');
console.log('6. Jika prediksi gagal, fallback ke jam 17:00');
