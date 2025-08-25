# Infinite Track - Backend API

Selamat datang di repositori backend untuk **Infinite Track**, sebuah **Platform Manajemen Kehadiran Cerdas** yang dirancang untuk mendukung lingkungan kerja modern yang fleksibel.

## 1. Ringkasan Proyek

**Infinite Track** adalah sistem presensi berbasis Node.js & Express yang menggantikan metode absensi konvensional. Tujuannya adalah untuk meningkatkan efisiensi, fleksibilitas, dan akurasi data kehadiran di lingkungan kerja seperti Infinite Learning. Keunikan utama proyek ini terletak pada implementasi **Fuzzy AHP (FAHP) murni** untuk memberikan penilaian dan rekomendasi yang cerdas serta dapat dipertanggungjawabkan.

### 🎯 **Visi & Misi**

- **Visi:** Menciptakan ekosistem kerja yang aman, fleksibel, dan cerdas
- **Misi:** Memberikan insights berbasis data untuk meningkatkan produktivitas dan kepuasan karyawan

## 2. Fitur Unggulan

Sistem ini memiliki empat pilar fungsionalitas utama yang membuatnya lebih dari sekadar aplikasi presensi biasa:

### **🏢 1. Presensi Multi-Mode & Aman**

- Mendukung mode kerja **WFO, WFH, dan WFA** secara penuh.
- Menggunakan validasi berlapis dengan **Geofencing** untuk lokasi dan **Face Recognition** untuk identitas, memastikan setiap absensi akurat dan terpercaya.
- **Timezone Consistency:** Semua operasi waktu menggunakan WIB (Jakarta, UTC+7) untuk akurasi data.
- **Real-time Status Tracking:** API yang optimized untuk mobile integration.

### **🧠 2. Sistem Rekomendasi & Skor Lokasi WFA**

- Merekomendasikan lokasi WFA di sekitar pengguna.
- Setiap lokasi dinilai oleh **FAHP murni** untuk menghasilkan **Skor Kelayakan**.
- **Suitability Labels:** 5 tingkat (Sangat Rendah → Sangat Tinggi) berbasis interval sama.
- **Multi-criteria Analysis (default):** Location type, Distance, Amenities.

### **⚡ 3. Proses Otomatis Malam Hari (Cron Jobs)**

- **Auto Alpha:** Menandai pengguna yang tidak hadir tanpa keterangan.
- **Missed Checkout Flag:** Menandai sesi yang melewati jam pulang + toleransi tanpa checkout (tanpa prediksi fuzzy).
- **WFA Resolution:** Memproses booking WFA yang disetujui.
- **Manual Trigger API:** Admin dapat memicu jobs secara manual.

### **📊 4. Dashboard Analitik dengan Indeks Kedisiplinan**

- Menyediakan laporan kehadiran yang komprehensif untuk manajemen.
- Menghasilkan **Indeks Kedisiplinan** 0–100 menggunakan **FAHP murni**.

## 3. Tumpukan Teknologi (Tech Stack)

### **🏗️ Core Technologies**

- **Runtime:** Node.js (ESM modules)
- **Framework:** Express.js
- **Database:** MySQL/MariaDB
- **ORM:** Sequelize
- **Authentication:** JWT + RBAC

### **🧠 Decision Engine**

- **FAHP (Pure):** TFN pairwise → Fuzzy Geometric Mean (Buckley) → centroid defuzzification → normalized weights (∑w=1)
- **Consistency Check:** CR dihitung dari matriks defuzzifikasi (eigenvalue approximation)

### **☁️ External Services**

- **Cloudinary** (media), **Geoapify** (places), **Winston** (logging)

### **🛠️ Development Tools**

- **Swagger/OpenAPI**, **ESLint + Prettier**, **PM2**

## 4. Panduan Setup & Instalasi

Berikut adalah langkah-langkah untuk menjalankan proyek ini di lingkungan development:

### **📥 4.1 Clone & Install**

```bash
# Clone repositori
git clone <url_repositori_anda>
cd infinite-track-backend

# Install dependensi
npm install
```

### **⚙️ 4.2 Konfigurasi Environment**

```bash
# Salin template environment
cp .env.example .env
```

Isi semua variabel yang dibutuhkan di dalam `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3005

# Database Configuration
DB_HOST=localhost
DB_NAME=v1_infinite_track
DB_USER=your_db_user
DB_PASS=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_minimum_256_characters_long

# External Services
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
GEOAPIFY_API_KEY=your_geoapify_api_key

# Optional: Logging & Monitoring
LOG_LEVEL=info
```

### **🗄️ 4.3 Setup Database**

```bash
# Pastikan MySQL/MariaDB berjalan
# Buat database baru (manual di MySQL)
CREATE DATABASE v1_infinite_track;

# Jalankan migrasi untuk membuat semua tabel
npm run migrate

# (Opsional) Isi data awal dengan seeder
npm run seed
```

### **🚀 4.4 Jalankan Server**

```bash
# Development mode (dengan hot reload)
npm run dev

# Production mode
npm start

# Dengan PM2 (production deployment)
npm run prod:pm2
```

Server akan berjalan di `http://localhost:3005` (atau port yang ditentukan di `.env`).

### **✅ 4.5 Verifikasi Setup**

```bash
# Health check
curl http://localhost:3005/health

# API documentation
open http://localhost:3005/docs

# Test timezone configuration
curl http://localhost:3005/api/attendance/test-timezone
```

## 5. Dokumentasi API (Endpoint Utama)

Dokumentasi API interaktif yang lengkap tersedia melalui **Swagger UI** saat server berjalan di:
**🌐 `http://localhost:3005/docs`**

### **📋 5.1 Endpoint Overview**

| Method                       | Path                              | Deskripsi Singkat                                     | Otorisasi        |
| :--------------------------- | :-------------------------------- | :---------------------------------------------------- | :--------------- |
| **🔐 Authentication**        |
| `POST`                       | `/api/auth/login`                 | Login pengguna dan mendapatkan token                  | Publik           |
| `POST`                       | `/api/auth/logout`                | Logout dan menghapus sesi                             | Pengguna         |
| `GET`                        | `/api/auth/me`                    | Mendapatkan data profil pengguna yang sedang login    | Pengguna         |
| **⏰ Attendance Management** |
| `GET`                        | `/api/attendance/status-today`    | Status absensi terkini (source of truth untuk UI)     | Pengguna         |
| `POST`                       | `/api/attendance/check-in`        | Melakukan proses check-in dengan geofencing           | Pengguna         |
| `POST`                       | `/api/attendance/checkout/:id`    | Melakukan proses check-out manual                     | Pengguna         |
| `GET`                        | `/api/attendance/history`         | Riwayat kehadiran dengan filtering dan pagination     | Pengguna         |
| `POST`                       | `/api/attendance/location-event`  | Log events geofence (ENTER/EXIT)                      | Pengguna         |
| **🌍 WFA Booking System**    |
| `POST`                       | `/api/bookings`                   | Mengajukan booking lokasi WFA baru                    | Pengguna         |
| `GET`                        | `/api/bookings/history`           | **[NEW]** Riwayat booking dengan advanced filtering   | Pengguna         |
| `PATCH`                      | `/api/bookings/:id`               | Update status booking (approve/reject)                | Admin/Management |
| `DELETE`                     | `/api/bookings/:id`               | Hapus booking (admin only)                            | Admin            |
| **🧠 WFA Intelligence**      |
| `GET`                        | `/api/wfa/recommendations`        | Rekomendasi lokasi WFA dengan Fuzzy AHP               | Pengguna         |
| `GET`                        | `/api/wfa/ahp-config`             | Konfigurasi algoritma AHP                             | Admin            |
| `POST`                       | `/api/wfa/test-ahp`               | Test AHP algorithm (debugging)                        | Admin            |
| **📊 Analytics & Reports**   |
| `GET`                        | `/api/summary`                    | **[ENHANCED]** Laporan komprehensif + Indeks Disiplin | Admin/Management |
| `GET`                        | `/api/discipline/user/:id`        | Indeks kedisiplinan individual                        | Admin/Management |
| `GET`                        | `/api/discipline/all`             | Overview disiplin semua karyawan                      | Admin            |
| **🤖 Job Management**        |
| `GET`                        | `/api/jobs/status`                | Status semua automated jobs                           | Admin            |
| `POST`                       | `/api/jobs/trigger/general-alpha` | **[NEW]** Trigger manual alpha job                    | Admin            |
| `POST`                       | `/api/jobs/trigger/wfa-bookings`  | **[NEW]** Trigger manual WFA resolution               | Admin            |
| `POST`                       | `/api/jobs/trigger/auto-checkout` | **[NEW]** Trigger manual auto-checkout                | Admin            |
| `POST`                       | `/api/jobs/trigger/all`           | **[NEW]** Trigger semua jobs sekaligus                | Admin            |
| **👥 User Management**       |
| `GET`                        | `/api/users`                      | Mengelola semua pengguna (CRUD)                       | Admin            |
| `POST`                       | `/api/users`                      | Buat user baru                                        | Admin            |
| `PATCH`                      | `/api/users/:id`                  | Update data user                                      | Admin            |
| `DELETE`                     | `/api/users/:id`                  | Hapus user                                            | Admin            |
| **📋 Reference Data**        |
| `GET`                        | `/api/roles`                      | Daftar semua roles                                    | Authenticated    |
| `GET`                        | `/api/positions`                  | Daftar semua positions                                | Authenticated    |
| `GET`                        | `/api/divisions`                  | Daftar semua divisions                                | Authenticated    |
| `GET`                        | `/api/locations`                  | Daftar office locations                               | Authenticated    |

### **🎯 5.2 Featured Endpoints**

#### **New Booking History API**

```bash
# Advanced filtering dengan pagination dan sorting
GET /api/bookings/history?status=approved&sort_by=schedule_date&sort_order=DESC&page=1&limit=10

# Response includes suitability scoring
{
  "success": true,
  "data": {
    "bookings": [
      {
        "booking_id": 123,
        "schedule_date": "2025-07-15",
        "status": "approved",
        "suitability_score": 87.5,
        "suitability_label": "Sangat Direkomendasikan",
        "location": {
          "description": "Starbucks Mall Panakkukang",
          "latitude": -5.1477,
          "longitude": 119.4327
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 48
    }
  }
}
```

#### **Enhanced Summary with Discipline Index**

```bash
# Comprehensive analytics dengan real-time discipline calculation
GET /api/summary?period=monthly&start_date=2025-07-01&end_date=2025-07-31

# Response includes discipline analytics
{
  "success": true,
  "summary": {
    "total_employees": 45,
    "average_attendance_rate": 92.5,
    "average_discipline_score": 78.2
  },
  "report": {
    "data": [
      {
        "user_id": 20,
        "user_name": "John Doe",
        "total_present": 22,
        "total_late": 3,
        "discipline_score": 85.5,
        "discipline_label": "Sangat Disiplin"
      }
    ]
  }
}
```

### **🔒 5.3 Authentication & Authorization**

#### **User Roles**

- **Employee:** Basic attendance dan WFA booking
- **Management:** View reports, manage bookings
- **Admin:** Full system access, job management

#### **JWT Token Structure**

```json
{
  "id": 20,
  "email": "user@company.com",
  "full_name": "John Doe",
  "role_name": "Admin",
  "iat": 1751607363,
  "exp": 1751693763
}
```

#### **API Rate Limiting**

- **General API:** 10 requests/second with 20 burst
- **Auth endpoints:** 3 requests/second with 5 burst
- **Health check:** No rate limiting

## 6. Arsitektur & Design Patterns

### **🏗️ 6.1 MVC Architecture**

```
src/
├── app.js              # Express app configuration
├── server.js           # Server entry point
├── config/             # Database & environment config
│   ├── database.js     # Sequelize config dengan timezone
│   └── index.js        # Configuration aggregator
├── models/             # Sequelize models & associations
│   ├── index.js        # Model aggregator & relationships
│   ├── *.model.js      # Individual model definitions
│   ├── migrations/     # Database schema migrations
│   └── seeders/        # Initial data seeders
├── controllers/        # Business logic & API handlers
│   ├── *.controller.js # Route-specific controllers
│   └── jobs.controller.js # Manual job trigger endpoints
├── routes/             # API route definitions
│   ├── index.js        # Route aggregator
│   └── *.routes.js     # Individual route files
├── middlewares/        # Custom middlewares
│   ├── authJwt.js      # JWT authentication
│   ├── roleGuard.js    # Role-based authorization
│   ├── validator.js    # Request validation
│   └── errorHandler.js # Global error handling
├── utils/              # Utility functions & helpers
│   ├── fuzzyAhpEngine.js # Core intelligence engine
│   ├── geofence.js     # Location validation
│   ├── logger.js       # Winston logging configuration
│   └── *.helper.js     # Various helper functions
├── jobs/               # Automated cron jobs
│   ├── autoCheckout.job.js    # Smart checkout prediction
│   ├── createGeneralAlpha.job.js # Auto alpha generation
│   └── resolveWfaBookings.job.js # WFA booking processing
└── docs/               # Documentation files
    ├── openapi.yaml    # Swagger/OpenAPI specification
    ├── *.md            # Various documentation
    └── *.guide.md      # Implementation guides
```

### **🧠 6.2 Fuzzy AHP Engine Architecture**

```javascript
// Core Intelligence Components
Fuzzy AHP Engine
├── WFA Recommendation System
│   ├── Location Type Scoring (70% weight)
│   ├── Distance Factor (23% weight)
│   └── Amenity Assessment (7% weight)
├── Discipline Index Calculator
│   ├── Attendance Rate (40% weight)
│   ├── Punctuality Score (35% weight)
│   └── Consistency Analysis (25% weight)
└── Smart Auto-Checkout Predictor
    ├── Check-in Time Pattern (40% weight)
    ├── Historical Hours (35% weight)
    └── Work Duration Context (25% weight)
```

### **⚡ 6.3 Automated Job Processing**

```javascript
// Cron Schedule (Asia/Jakarta timezone)
Jobs Schedule
├── 23:55 Daily: Smart Auto-Checkout
├── 00:05 Daily: General Alpha Generation
├── 06:00 Daily: WFA Booking Resolution
└── Manual Triggers Available via API
```

## FAHP (Fuzzy AHP) Engine

- Method: TFN → FGM (Buckley) → defuzzify (centroid) → normalize (∑w=1) → CR check.
- Normalization: min–max to [0,1] with benefit/cost; labeling equal-interval (5 classes).
- Public APIs:
  - `calculateWfaScore(place)` → `{ score(0..100), label, breakdown, weights, CR, warning? }`
  - `calculateDisciplineIndex(metrics)` → `{ score(0..100), label, breakdown, weights, CR, warning? }`
  - `getWfaAhpWeights()`, `getDisciplineAhpWeights()` → `{... , consistency_ratio}`
- Configuration: TFN scales and pairwise matrices in `src/analytics/config.fahp.js`.
- Consistency: CR computed from defuzzified matrix; threshold configurable via `AHP_CR_THRESHOLD` (default 0.10).
- Auto-checkout: prediction removed; system flags likely-missed-checkout using time tolerance only.

## 7. Fuzzy AHP Intelligence System

### **🎯 7.1 WFA Suitability Scoring**

Setiap lokasi WFA dinilai menggunakan 5-tier scoring system:

| **Suitability Label**     | **Score Range** | **Business Action**   |
| ------------------------- | --------------- | --------------------- |
| `Sangat Direkomendasikan` | 85-100          | Auto-approve kandidat |
| `Direkomendasikan`        | 70-84           | Standard approval     |
| `Cukup Direkomendasikan`  | 55-69           | Manual review needed  |
| `Kurang Direkomendasikan` | 40-54           | Likely rejection      |
| `Tidak Direkomendasikan`  | 0-39            | Auto-reject           |

### **📊 7.2 Discipline Index Components**

```javascript
// Discipline scoring methodology
const disciplineFactors = {
  attendanceRate: {
    weight: 0.4,
    description: 'Persentase kehadiran dalam periode'
  },
  punctualityScore: {
    weight: 0.35,
    description: 'Tingkat ketepatan waktu check-in'
  },
  consistencyAnalysis: {
    weight: 0.25,
    description: 'Konsistensi pola kehadiran'
  }
};
```

### **🔮 7.3 Smart Prediction Features**

- **Auto-Checkout Prediction:** Accuracy rate 85%+ based on historical patterns
- **Location Recommendation:** Multi-criteria analysis dengan real-time data
- **Anomaly Detection:** Fake location prevention melalui speed analysis

## 8. Production Deployment

### **🚀 8.1 Quick Production Setup**

```bash
# Clone & setup
git clone <repository_url>
cd infinite-track-backend

# Production dependencies
npm ci --only=production

# Environment setup
cp .env.example .env.production
# Edit .env.production dengan production credentials

# Database setup
npm run migrate

# Deploy dengan PM2
npm run prod:deploy
```

### **🔧 8.2 Production Configuration**

```javascript
// ecosystem.config.js (PM2 configuration)
module.exports = {
  apps: [
    {
      name: 'infinite-track-backend',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3005
      }
    }
  ]
};
```

### **📋 8.3 Production Checklist**

- ✅ Environment variables configured
- ✅ Database migrations applied
- ✅ SSL certificates installed
- ✅ Nginx reverse proxy configured
- ✅ PM2 process manager setup
- ✅ Log rotation configured
- ✅ Backup strategy implemented
- ✅ Monitoring alerts configured

## 9. Testing & Quality Assurance

### **🧪 9.1 Available Test Scripts**

```bash
# Run all tests
npm test

# Lint code quality
npm run lint

# Test API documentation
npm run test:docs

# Test production deployment
npm run test:production

# Test booking history endpoint
node test-booking-history.js

# Manual health check
npm run health:check
```

### **📊 9.2 Testing Coverage**

- **Unit Tests:** Core business logic functions
- **Integration Tests:** API endpoint functionality
- **Performance Tests:** Load testing untuk analytics endpoints
- **Security Tests:** Authentication dan authorization validation

## 10. Monitoring & Maintenance

### **📈 10.1 Health Monitoring**

```bash
# Health check endpoints
GET /health                    # Basic server health
GET /api/attendance/test-timezone  # Timezone configuration
GET /api/jobs/status          # Automated jobs status
```

### **📝 10.2 Logging System**

```javascript
// Winston logging levels
{
  error: 0,    // System errors & exceptions
  warn: 1,     // Business logic warnings
  info: 2,     // General information
  debug: 3     // Detailed debugging info
}

// Log files location
logs/
├── app-YYYY-MM-DD.log     # Daily rotating logs
├── error-YYYY-MM-DD.log   # Error-only logs
└── combined.log           # All logs combined
```

### **⚠️ 10.3 Common Troubleshooting**

#### Database Connection Issues

```bash
# Check database connection
npm run db:test

# Reset database (development only)
npm run db:reset
```

#### Timezone Issues

```bash
# Verify timezone configuration
curl http://localhost:3005/api/attendance/test-timezone

# Check database timezone settings
npm run db:timezone:check
```

#### Job Processing Issues

```bash
# Check cron job status
GET /api/jobs/status

# Manual trigger for debugging
POST /api/jobs/trigger/all
```

## 11. Contributing & Development Guidelines

### **👥 11.1 Development Workflow**

1. Fork repository & create feature branch
2. Follow ESLint configuration untuk code style
3. Add tests untuk new features
4. Update documentation sesuai perubahan
5. Submit pull request dengan clear description

### **📝 11.2 Code Style Guidelines**

```javascript
// ESM modules only
import express from 'express';

// Consistent error handling
try {
  await someAsyncOperation();
} catch (error) {
  logger.error('Operation failed:', error);
  next(error);
}

// Comprehensive documentation
/**
 * Calculate WFA suitability score using Fuzzy AHP
 * @param {Object} location - Location data with coordinates
 * @returns {Promise<{score: number, label: string}>}
 */
```

## 12. Changelog & Version History

### **🆕 Version 2.0.0 (July 2025)**

- ✅ **NEW:** Advanced booking history API dengan filtering & sorting
- ✅ **ENHANCED:** Complete timezone consistency untuk WIB accuracy
- ✅ **NEW:** Manual job trigger endpoints untuk admin control
- ✅ **ENHANCED:** Comprehensive Swagger documentation
- ✅ **NEW:** Production-ready deployment scripts
- ✅ **FIXED:** All cron job scheduling dan execution issues

### **📈 Version 1.5.0 (June 2025)**

- ✅ Enhanced Fuzzy AHP engine dengan hybrid scoring
- ✅ Smart auto-checkout dengan predictive analytics
- ✅ Real-time discipline index calculation
- ✅ Complete API documentation dengan Swagger UI

## 13. Support & Resources

### **📞 Support Channels**

- **Technical Issues:** Submit GitHub issues dengan detailed description
- **Feature Requests:** Create feature request dengan business justification
- **Security Concerns:** Contact security team directly

### **📚 Additional Documentation**

- **📖 API Reference:** [`/docs`](http://localhost:3005/docs) (Swagger UI)
- **🔧 Deployment Guide:** [`docs/PRODUCTION_GO_LIVE_GUIDE.md`](docs/PRODUCTION_GO_LIVE_GUIDE.md)
- **📊 Analytics Guide:** [`docs/SUITABILITY_LABELS_SCORING_GUIDE.md`](docs/SUITABILITY_LABELS_SCORING_GUIDE.md)
- **🎯 Project Context:** [`memory-bank/projectbrief.md`](memory-bank/projectbrief.md)

### **🔗 Quick Links**

- **Health Check:** [`http://localhost:3005/health`](http://localhost:3005/health)
- **API Documentation:** [`http://localhost:3005/docs`](http://localhost:3005/docs)
- **OpenAPI Spec:** [`http://localhost:3005/docs/openapi.yaml`](http://localhost:3005/docs/openapi.yaml)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**🎉 Project Status: ✅ PRODUCTION READY**

_Infinite Track Backend adalah solusi enterprise-grade untuk manajemen kehadiran modern dengan artificial intelligence terintegrasi. Siap untuk deployment dan scaling di environment production._

**Last Updated:** July 7, 2025  
**Version:** 2.0.0  
**Maintainer:** Infinite Track Development Team
