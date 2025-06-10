# InfiniteTrack Backend - Complete Documentation Recap

## 📋 **Project Overview**

**InfiniteTrack** is a comprehensive attendance management system built with Node.js that supports multiple work modes (WFO, WFH, WFA) with flexible geofencing, face photo verification, and automatic work hour calculation.

### 🏗️ **Technology Stack**

- **Runtime**: Node.js v20.18.0
- **Framework**: Express.js with ESM modules
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Geolocation**: Geolib for distance calculations
- **Validation**: Express-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Process Management**: PM2
- **Logging**: Winston
- **Cron Jobs**: Node-cron for automated attendance management
- **Holiday Detection**: date-holidays for working day validation
- **Timezone Support**: Client-aware timezone handling for global workforce

### 🚀 **Key Features**

- ✅ Multi-mode attendance (WFO, WFH, WFA)
- ✅ Flexible geofencing validation with configurable radius
- ✅ Face photo upload with Cloudinary integration
- ✅ Automatic work hour calculation with timezone support
- ✅ JWT-based authentication with role-based access
- ✅ Booking system for WFA locations with conflict validation
- ✅ **Auto checkout system with node-cron** - Automatically checks out users at configurable time
- ✅ **Booking conflict prevention** - Prevents duplicate bookings on same date
- ✅ **Auto Alpha Detection System** - Automatically marks absent users as alpha
- ✅ **WFA Bookings Resolver** - Processes unused WFA bookings into alpha records
- ✅ **General Alpha System** - Creates alpha records for users who don't attend on working days
- ✅ **Client-side Timezone Support** - Respects local device timezone for attendance windows
- ✅ Comprehensive error handling and validation
- ✅ Transaction safety for data integrity
- ✅ Complete API documentation

---

## 📁 **Documentation Structure**

### Core Documentation Files

| Document                   | Purpose                            | Status      |
| -------------------------- | ---------------------------------- | ----------- |
| `README.md`                | Project overview and quick start   | ✅ Complete |
| `BACKEND_DOCUMENTATION.md` | Complete technical documentation   | ✅ Complete |
| `API_REFERENCE.md`         | Detailed API reference guide       | ✅ Complete |
| `SETUP_DEPLOYMENT.md`      | Setup, deployment, and maintenance | ✅ Complete |

### Feature-Specific Documentation

| Document                        | Feature                        | Status      |
| ------------------------------- | ------------------------------ | ----------- |
| `CHECKOUT_IMPLEMENTATION.md`    | Checkout functionality details | ✅ Complete |
| `CHECKOUT_API_SPEC.md`          | Checkout API specification     | ✅ Complete |
| `CHECKOUT_TESTING.md`           | Checkout testing guidelines    | ✅ Complete |
| `WFO_CHECKIN_IMPLEMENTATION.md` | WFO check-in implementation    | ✅ Complete |
| `CHECKIN_REVISION_SUMMARY.md`   | Check-in feature revisions     | ✅ Complete |

### API Documentation

| Document       | Purpose                       | Status      |
| -------------- | ----------------------------- | ----------- |
| `openapi.yaml` | OpenAPI/Swagger specification | ✅ Complete |

---

## 🛠️ **Quick Start Guide**

### Prerequisites

- Node.js v20.18.0 or higher
- MySQL 8.0 or higher
- Git

### Local Development Setup

```bash
# 1. Clone Repository
git clone <repository-url>
cd Infinit_Track_BE

# 2. Install Dependencies
npm install

# 3. Environment Configuration
cp .env.example .env
# Edit .env with your configuration

# 4. Database Setup
mysql -u root -p
CREATE DATABASE infinite_track;

# Run migrations and seeders
npm run migrate
npm run seed

# 5. Start Development Server
npm run dev
```

**Server will be available at**: `http://localhost:3005`

---

## 🏢 **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   API Gateway   │    │    Database     │
│  (Mobile/Web)   │◄───┤   Express.js    │◄───┤     MySQL       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cloudinary    │
                       │  File Storage   │
                       └─────────────────┘
```

### Directory Structure

```
src/
├── app.js                 # Express app configuration
├── server.js              # Server entry point
├── config/
│   ├── database.js        # Database configuration
│   ├── cloudinary.js      # Cloudinary configuration
│   └── index.js           # Config aggregator
├── controllers/           # Business logic
├── middlewares/           # Custom middlewares
├── models/               # Database models
├── routes/               # API routes
├── jobs/                 # Cron jobs (auto checkout)
├── utils/                # Utility functions
└── logs/                 # Application logs
```

---

## 🗄️ **Database Schema**

### Core Tables

- **users** - User accounts and profiles
- **attendance** - Main attendance records
- **locations** - Geographic locations for WFA
- **bookings** - Location booking requests
- **settings** - System configuration settings (including auto checkout time)

### Reference Tables

- **roles** - User roles (Admin, Manager, Employee, Internship)
- **programs** - Educational programs
- **divisions** - Company divisions
- **positions** - Job positions
- **attendance_categories** - WFO, WFH, WFA categories
- **attendance_status** - Check-in, Check-out status
- **booking_status** - Pending, Approved, Rejected

### Key Relationships

- Users belong to roles, programs, divisions, positions
- Attendance records link to users and categories
- Bookings connect users with locations
- Photos metadata stored separately with Cloudinary URLs

---

## 🔐 **Authentication System**

### JWT Implementation

```javascript
// Token Structure
{
  "id": 13,
  "email": "user@example.com",
  "role": "Admin",
  "iat": 1683000000,
  "exp": 1683086400
}
```

### Middleware Chain

```javascript
router.post(
  '/checkout/:id',
  verifyToken, // JWT authentication
  checkOutValidation, // Input validation
  validate, // Error handling
  checkOut // Controller function
);
```

### Role-Based Access Control

- **Admin**: Full system access
- **Manager**: Department-level access
- **Employee**: Own data access
- **Internship**: Basic attendance features

---

## 🤖 **Alpha Detection & Automated Attendance Systems**

### Overview

The system includes three automated attendance management features that ensure accurate attendance tracking and automatically handle edge cases where users don't follow standard check-in/check-out procedures.

### 🕐 **System Architecture - Cron Job Schedule**

```
Daily Schedule (Asia/Jakarta Timezone):
23:45 - General Alpha Detection (Working days only)
23:50 - WFA Bookings Resolver
23:55 - Auto Checkout System
```

### 🎯 **1. Auto Checkout System**

#### Purpose

Automatically checks out users who forget to check out at the end of the workday.

#### Configuration

- **File**: `src/jobs/autoCheckout.js`
- **Schedule**: Every day at 23:55 (configurable via settings table)
- **Default Auto-Checkout Time**: 17:00:00 (configurable)

#### Key Features

- Processes current day and historical attendance records
- Calculates work hours automatically
- Adds system notes to indicate auto checkout
- Admin configuration and manual trigger endpoints

#### Database Settings

```sql
INSERT INTO settings (setting_key, setting_value, description)
VALUES ('checkout.auto_time', '17:00:00', 'Waktu otomatis checkout untuk pengguna yang lupa checkout');
```

#### API Endpoints

```http
POST /api/attendance/setup-auto-checkout        # Admin setup
POST /api/attendance/manual-auto-checkout       # Manual trigger
GET  /api/attendance/auto-checkout-settings     # View configuration
POST /api/attendance/process-past-attendances   # Process historical data
```

### 🏢 **2. WFA Bookings Resolver**

#### Purpose

Automatically creates alpha attendance records for users who have approved WFA bookings but don't use them (don't check-in on the scheduled day).

#### Configuration

- **File**: `src/jobs/resolveWfaBookings.job.js`
- **Schedule**: Every day at 23:50
- **Scope**: Users with approved WFA bookings who didn't check-in

#### Process Flow

1. Find all approved WFA bookings for the current date
2. Check if users actually checked in using those bookings
3. Create alpha attendance records for unused bookings
4. Log processing results

#### Implementation Example

```javascript
// Find approved WFA bookings for today
const approvedBookings = await Booking.findAll({
  where: {
    schedule_date: todayDate,
    status: 1 // approved status
  }
});

// For each booking without attendance record
await Attendance.create({
  user_id: booking.user_id,
  category_id: 3, // Work From Anywhere
  status_id: 3, // alpha status
  location_id: booking.location_id,
  booking_id: booking.booking_id,
  time_in: null,
  time_out: null,
  work_hour: 0,
  attendance_date: booking.schedule_date,
  notes: 'Absensi alpha otomatis - booking WFA disetujui tetapi tidak digunakan'
});
```

#### API Endpoints

```http
POST /api/attendance/manual-resolve-wfa-bookings  # Manual trigger (Admin/Management)
```

### 👥 **3. General Alpha Detection System**

#### Purpose

Creates alpha attendance records for all users (except Admin/Management) who have no attendance record on working days.

#### Configuration

- **File**: `src/jobs/createGeneralAlpha.job.js`
- **Schedule**: Working days (Monday-Friday) at 23:45
- **Scope**: All employees except Admin and Management roles
- **Holiday Support**: Uses `date-holidays` library for Indonesia holidays

#### Exclusion Rules

- **Excluded Roles**: Admin, Management
- **Excluded Days**: Weekends, national holidays
- **Excluded Users**: Those who already have attendance records
- **Excluded Users**: Those with approved WFA bookings (handled by WFA resolver)

#### Process Flow

1. **Working Day Check**: Verify current date is a working day (not weekend/holiday)
2. **User Collection**: Get all active users except Admin/Management
3. **Attendance Check**: Find users who already have attendance records
4. **Booking Check**: Find users with approved WFA bookings
5. **Alpha Creation**: Create alpha records for remaining users

#### Holiday Configuration

```javascript
const Holidays = require('date-holidays');
const hd = new Holidays('ID'); // Indonesia holidays

const isWorkingDay = (date) => {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  const isHoliday = hd.isHoliday(date);

  return !isWeekend && !isHoliday;
};
```

#### API Endpoints

```http
POST /api/attendance/manual-general-alpha        # Manual trigger (Admin/Management)
```

### 🛡️ **4. Booking Conflict Prevention**

#### Purpose

Prevents users from creating multiple bookings for the same date, ensuring clear work mode assignment.

#### Implementation Location

- **File**: `src/controllers/booking.controller.js`
- **Function**: Enhanced `createBooking` with conflict validation

#### Validation Logic

```javascript
// Check for existing bookings on the same date
const existingBookingOnDate = await Booking.findOne({
  where: {
    user_id: userId,
    schedule_date: scheduleDate.toISOString().split('T')[0],
    status: { [Op.in]: [1, 3] } // approved (1) atau pending (3)
  },
  transaction
});

if (existingBookingOnDate) {
  await transaction.rollback();
  return res.status(400).json({
    success: false,
    message:
      'Anda sudah memiliki booking pada tanggal tersebut. Tidak dapat membuat duplikat booking pada hari yang sama.'
  });
}
```

#### Business Rules

- One booking per user per date
- Prevents conflicts between WFO, WFH, WFA modes
- Validates against both pending and approved bookings
- Clear error messages for user guidance

### 📊 **Alpha System Response Examples**

#### Manual Resolve WFA Bookings Response

```json
{
  "success": true,
  "message": "Resolve unused WFA bookings job berhasil dijalankan secara manual.",
  "data": {
    "success": true,
    "message": "Resolve unused WFA bookings job executed manually",
    "timestamp": "2025-06-09T15:30:45.123Z"
  }
}
```

#### Manual General Alpha Response

```json
{
  "success": true,
  "message": "Create general alpha records job berhasil dijalankan secara manual.",
  "data": {
    "success": true,
    "message": "General alpha records creation completed",
    "timestamp": "2025-06-09T15:35:20.456Z"
  }
}
```

### 🔧 **Admin Management Endpoints**

#### Auto Checkout Management

```http
POST /api/attendance/setup-auto-checkout          # Initial setup + process past data
POST /api/attendance/manual-auto-checkout         # Test auto checkout now
GET  /api/attendance/auto-checkout-settings       # View current configuration
POST /api/attendance/process-past-attendances     # Process historical data only
```

#### Alpha Detection Management

```http
POST /api/attendance/manual-resolve-wfa-bookings  # Process unused WFA bookings
POST /api/attendance/manual-general-alpha         # Process general alpha detection
```

#### Access Control

- **Required Role**: Admin or Management
- **Authentication**: Bearer token required
- **Authorization**: Role validation in middleware

### 🚀 **Server Integration**

#### Server Startup Sequence

```javascript
// src/server.js - Job initialization order
(async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    // Initialize automated jobs
    startAutoCheckoutJob(); // Auto checkout at 23:55
    startResolveWfaBookingsJob(); // WFA resolver at 23:50
    startCreateGeneralAlphaJob(); // General alpha at 23:45

    logger.info('All automated attendance jobs initialized');
  } catch (err) {
    logger.error('Initialization failed:', err.message);
  }
})();
```

#### Dependencies Installation

```bash
# Install required packages
npm install date-holidays  # For holiday detection
npm install node-cron      # For job scheduling (already installed)
```

### 🔍 **Monitoring & Logs**

#### Log Patterns

```javascript
// Auto checkout logs
logger.info('Auto checkout completed. Success: 5, Errors: 0');

// WFA resolver logs
logger.info('Resolve unused WFA bookings job completed. Alpha records created: 3, Skipped: 2');

// General alpha logs
logger.info('Create general alpha records job completed. Alpha records created: 2, Errors: 0');
```

### 🧪 **Testing Commands**

#### PowerShell Testing Examples

```powershell
# Get admin token
$adminToken = (Invoke-RestMethod -Uri "http://localhost:3005/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@infinite.com","password":"admin123"}').data.token

# Test auto checkout setup
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/setup-auto-checkout" -Method POST -Headers @{"Authorization"="Bearer $adminToken"}

# Test WFA bookings resolver
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/manual-resolve-wfa-bookings" -Method POST -Headers @{"Authorization"="Bearer $adminToken"}

# Test general alpha detection
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/manual-general-alpha" -Method POST -Headers @{"Authorization"="Bearer $adminToken"}

# Check auto checkout settings
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/auto-checkout-settings" -Headers @{"Authorization"="Bearer $adminToken"} | ConvertTo-Json -Depth 10
```

### 📋 **Business Logic Summary**

#### System Priorities

1. **User Check-in** (Highest) - Actual user attendance takes precedence
2. **Approved WFA Bookings** - Recognized as valid work arrangement
3. **Auto Checkout** - Ensures complete attendance records
4. **Alpha Detection** - Catches missed attendance

#### Processing Order (Daily)

1. **23:45**: General alpha detection for users with no attendance
2. **23:50**: WFA bookings resolver for unused bookings
3. **23:55**: Auto checkout for incomplete attendance records

#### Exclusion Rules

- **Admin/Management**: Excluded from general alpha detection
- **Weekend/Holidays**: No alpha detection on non-working days
- **Existing Records**: Users with any attendance record are skipped
- **WFA Users**: Handled separately by WFA resolver

This comprehensive alpha detection system ensures accurate attendance tracking while respecting business rules and providing flexibility for different work arrangements and edge cases.

---

## 🤖 **Auto Checkout System (Legacy Documentation)**

> **Note**: This section contains the original auto checkout implementation. The enhanced alpha detection system above includes updated auto checkout functionality as part of the comprehensive attendance management suite.

### Overview

The auto checkout system automatically checks out users who forget to check out at the end of the workday. It runs as a cron job using `node-cron` and processes both current day and past attendance records.

### Current Configuration (Updated)

- **Schedule**: Modified to run at **23:55** (was previously every minute)
- **Integration**: Part of the comprehensive alpha detection system
- **Admin Controls**: Enhanced with new management endpoints

### Key Features

- **Automated Processing**: Runs at 23:55 daily to check for users needing checkout
- **Configurable Time**: Admin-configurable auto checkout time (default: 17:00:00)
- **Past Data Processing**: Processes historical attendance records that were never checked out
- **Jakarta Timezone**: All operations use Asia/Jakarta timezone (UTC+7)
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Admin Controls**: Setup and manual trigger endpoints for administrators

### Implementation Details

#### Cron Job Configuration

```javascript
// Runs every minute checking for auto checkout time
cron.schedule('* * * * *', autoCheckoutJob, {
  scheduled: true,
  timezone: 'Asia/Jakarta'
});
```

#### Auto Checkout Logic

```javascript
// Check if current time matches auto checkout time (within 1 minute window)
const autoTimeMinutes = timeToMinutes(autoTime);
const currentTimeMinutes = timeToMinutes(currentTimeString);
const isAutoCheckoutTime = Math.abs(currentTimeMinutes - autoTimeMinutes) <= 1;

if (isAutoCheckoutTime) {
  // Process all active attendances (checked in but not checked out)
  const activeAttendances = await Attendance.findAll({
    where: {
      time_out: null,
      attendance_date: { [Op.lte]: currentDate }
    }
  });
}
```

#### Work Hour Calculation

```javascript
// Calculate work hours for auto checkout
const timeIn = new Date(attendance.time_in);
const workHour = calculateWorkHour(timeIn, checkoutTime);

await attendance.update({
  time_out: checkoutTime,
  work_hour: workHour,
  notes: attendance.notes + '\nSesi diakhiri otomatis oleh sistem.'
});
```

### Database Configuration

#### Settings Table

The auto checkout time is stored in the `settings` table:

```sql
INSERT INTO settings (setting_key, setting_value, description)
VALUES ('checkout.auto_time', '17:00:00', 'Waktu otomatis checkout untuk pengguna yang lupa checkout');
```

### API Endpoints

#### Setup Auto Checkout Configuration

- **Endpoint**: `POST /api/attendance/setup-auto-checkout`
- **Access**: Admin/Management only
- **Description**: Creates/updates auto checkout time setting and processes all past attendance records
- **Response**: Configuration status and processing results

#### Manual Auto Checkout Trigger

- **Endpoint**: `POST /api/attendance/manual-auto-checkout`
- **Access**: Admin/Management only
- **Description**: Manually triggers the auto checkout process for testing
- **Response**: Execution status and timestamp

#### Process Past Attendances

- **Endpoint**: `POST /api/attendance/process-past-attendances`
- **Access**: Admin/Management only
- **Description**: Processes only past attendance records without changing settings
- **Response**: Processing results

#### Get Auto Checkout Settings

- **Endpoint**: `GET /api/attendance/auto-checkout-settings`
- **Access**: Admin/Management only
- **Description**: Retrieves current auto checkout configuration and active attendances
- **Response**: Settings and current status

### File Structure

```
src/
├── jobs/
│   └── autoCheckout.js           # Main cron job implementation
├── utils/
│   └── setupAutoCheckout.js      # Setup and configuration utilities
├── controllers/
│   └── attendance.controller.js  # Auto checkout API endpoints
└── routes/
    └── attendance.routes.js      # Route definitions
```

### Server Integration

The auto checkout job is automatically started when the server initializes:

```javascript
// src/server.js
import { startAutoCheckoutJob } from './jobs/autoCheckout.js';

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    // Initialize auto checkout job after database connection
    startAutoCheckoutJob();
  } catch (err) {
    logger.error('Database connection failed:', err.message);
  }
})();
```

### Monitoring and Logs

The system provides comprehensive logging for monitoring:

```javascript
// Example log output
logger.info('Starting automatic checkout job...');
logger.info(`Current Jakarta time: 17:00:15, Auto checkout time: 17:00:00`);
logger.info('Auto checkout time reached, processing automatic checkouts...');
logger.info(`Found 5 active attendances to auto checkout`);
logger.info(`Auto checkout successful for user 123, attendance 456, date: 2025-06-06`);
logger.info(`Auto checkout completed. Success: 5, Errors: 0`);
```

### Error Handling

- **Database Connection**: Graceful handling of database connection issues
- **Transaction Safety**: All operations use database transactions
- **Individual Failures**: One failed checkout doesn't stop processing others
- **Comprehensive Logging**: All errors are logged with context

### Testing and Debugging

#### Manual Testing

```bash
# Trigger manual auto checkout
curl -X POST http://localhost:3005/api/attendance/manual-auto-checkout \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Check auto checkout settings
curl -X GET http://localhost:3005/api/attendance/auto-checkout-settings \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Setup Process

```bash
# Initial setup (creates setting and processes past data)
curl -X POST http://localhost:3005/api/attendance/setup-auto-checkout \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Process only past data (without changing settings)
curl -X POST http://localhost:3005/api/attendance/process-past-attendances \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📍 **Attendance System**

### Work Modes

1. **WFO (Work From Office)**: Office location validation
2. **WFH (Work From Home)**: Home address validation
3. **WFA (Work From Anywhere)**: Flexible location with booking

### Geofencing Logic

```javascript
// Distance calculation using Geolib
const distance = getDistance(
  { latitude: userLat, longitude: userLon },
  { latitude: locationLat, longitude: locationLon }
);

// Validation against location radius
if (distance <= location.radius) {
  // Allow check-in/check-out
}
```

### Work Hour Calculation

```javascript
// Jakarta timezone (UTC+7) handling
const jakartaOffset = 7;
const jakartaTimeOut = new Date(timeOut.getTime() + jakartaOffset * 60000);
const workHour = Math.round(((timeOutMs - timeInMs) / (1000 * 60 * 60)) * 100) / 100;
```

---

## 📚 **API Reference Summary**

### Base Information

- **Base URL**: `http://localhost:3005/api`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`
- **Timezone**: All timestamps use Asia/Jakarta (UTC+7)

### Authentication Flow for Frontend/Android

#### 1. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 13,
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "Employee",
      "nip_nim": "EMP001",
      "profile_photo": "https://res.cloudinary.com/..."
    }
  }
}
```

#### 2. Token Usage

All subsequent requests must include the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Main Endpoints

#### Attendance Management

##### Check Today's Status

```http
GET /api/attendance/status-today
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "can_check_in": true,
    "can_check_out": false,
    "checked_in_at": null,
    "active_mode": "Work From Office",
    "active_location": {
      "location_id": 1,
      "latitude": -6.1754,
      "longitude": 106.8272,
      "radius": 100,
      "description": "Infinite Learning Office",
      "category": "Work From Office"
    },
    "today_date": "2025-06-06",
    "is_holiday": false,
    "holiday_checkin_enabled": false,
    "current_time": "2025-06-06T09:30:00.000Z",
    "checkin_window": {
      "start_time": "08:00:00",
      "end_time": "18:00:00"
    },
    "checkout_auto_time": "17:00:00"
  }
}
```

##### Check-In Process

```http
POST /api/attendance/check-in
Authorization: Bearer {token}
Content-Type: application/json

{
  "category_id": 1,
  "latitude": -6.1754,
  "longitude": 106.8272,
  "notes": "Check-in dari mobile app",
  "booking_id": null
}
```

**Category IDs:**

- `1`: WFO (Work From Office)
- `2`: WFH (Work From Home)
- `3`: WFA (Work From Anywhere)

**Response:**

```json
{
  "success": true,
  "data": {
    "id_attendance": 123,
    "user_id": 13,
    "category_id": 1,
    "status_id": 1,
    "location_id": 1,
    "booking_id": null,
    "time_in": "2025-06-06T09:30:00.000Z",
    "time_out": null,
    "work_hour": 0,
    "attendance_date": "2025-06-06",
    "notes": "Check-in dari mobile app"
  },
  "message": "Check-in berhasil"
}
```

##### Check-Out Process

```http
POST /api/attendance/checkout/{attendance_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "latitude": -6.1754,
  "longitude": 106.8272
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id_attendance": 123,
    "time_out": "2025-06-06T17:30:00.000Z",
    "work_hour": 8.0,
    "message": "Check-out berhasil"
  }
}
```

##### Get Attendance History

```http
GET /api/attendance/history?page=1&limit=10
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "attendances": [
      {
        "id_attendance": 123,
        "time_in": "09:30:00",
        "time_out": "17:30:00",
        "work_hour": "8 jam 0 menit",
        "attendance_date": "2025-06-06",
        "location": {
          "location_id": 1,
          "description": "Infinite Learning Office",
          "latitude": -6.1754,
          "longitude": 106.8272
        },
        "status": "Check In",
        "information": "Work From Office",
        "notes": "Check-in dari mobile app"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 45,
      "items_per_page": 10,
      "has_next_page": true,
      "has_prev_page": false
    }
  },
  "message": "Riwayat absensi berhasil diambil"
}
```

#### Booking System (WFA Mode)

##### Get Available Locations

```http
GET /api/location
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "location_id": 3,
      "description": "Coworking Space Jakarta",
      "latitude": -6.2088,
      "longitude": 106.8456,
      "radius": 50,
      "address": "Jl. Sudirman No. 123",
      "category": "Work From Anywhere"
    }
  ]
}
```

##### Create Booking

```http
POST /api/booking
Authorization: Bearer {token}
Content-Type: application/json

{
  "location_id": 3,
  "schedule_date": "2025-06-07",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "purpose": "Client meeting and remote work"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "booking_id": 456,
    "location_id": 3,
    "user_id": 13,
    "schedule_date": "2025-06-07",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "purpose": "Client meeting and remote work",
    "status": 0,
    "status_name": "Pending"
  },
  "message": "Booking berhasil dibuat"
}
```

##### Get User Bookings

```http
GET /api/booking?page=1&limit=10
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "booking_id": 456,
      "location": {
        "location_id": 3,
        "description": "Coworking Space Jakarta",
        "address": "Jl. Sudirman No. 123"
      },
      "schedule_date": "2025-06-07",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "purpose": "Client meeting and remote work",
      "status": "Approved",
      "created_at": "2025-06-06T10:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 2,
    "total_items": 15,
    "items_per_page": 10
  }
}
```

#### User Management

##### Get User Profile

```http
GET /api/auth/profile
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id_users": 13,
    "email": "user@example.com",
    "full_name": "John Doe",
    "nip_nim": "EMP001",
    "phone_number": "+6281234567890",
    "profile_photo": "https://res.cloudinary.com/...",
    "role": {
      "role_id": 3,
      "role_name": "Employee"
    },
    "program": {
      "program_id": 1,
      "program_name": "Software Engineering"
    },
    "division": {
      "division_id": 1,
      "division_name": "Technology"
    },
    "position": {
      "position_id": 1,
      "position_name": "Software Developer"
    }
  }
}
```

##### Update Profile

```http
PUT /api/users/{user_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "John Doe Updated",
  "phone_number": "+6281234567890",
  "address": "Jl. Example No. 123"
}
```

#### Admin Endpoints

##### Get All Attendances (Admin/Management)

```http
GET /api/attendance?search=john&page=1&limit=10
Authorization: Bearer {admin_token}
```

**Response:**

```json
{
  "success": true,
  "message": "Data absensi berhasil diambil",
  "data": [
    {
      "id_attendance": 123,
      "id": 13,
      "full_name": "John Doe",
      "nip_nim": "EMP001",
      "role_name": "Employee",
      "time_in": "09:30:00",
      "time_out": "17:30:00",
      "work_hour": "8 jam 0 menit",
      "attendance_date": "2025-06-06",
      "location": {
        "location_id": 1,
        "description": "Infinite Learning Office",
        "latitude": -6.1754,
        "longitude": 106.8272
      },
      "status": "Check In",
      "information": "Work From Office",
      "notes": "Check-in dari mobile app"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_records": 95,
    "records_per_page": 10,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

##### Auto Checkout Management

```http
# Setup auto checkout system
POST /api/attendance/setup-auto-checkout
Authorization: Bearer {admin_token}

# Manual trigger auto checkout
POST /api/attendance/manual-auto-checkout
Authorization: Bearer {admin_token}

# Get auto checkout settings
GET /api/attendance/auto-checkout-settings
Authorization: Bearer {admin_token}

# Process past attendances only
POST /api/attendance/process-past-attendances
Authorization: Bearer {admin_token}
```

##### Alpha Detection Management

```http
# Manual resolve WFA bookings
POST /api/attendance/manual-resolve-wfa-bookings
Authorization: Bearer {admin_token}

# Manual general alpha detection
POST /api/attendance/manual-general-alpha
Authorization: Bearer {admin_token}
```

**All alpha detection endpoints:**

- **Access**: Admin/Management roles only
- **Request Body**: None required (simple triggers)
- **Authentication**: Bearer token required
- **Response**: Execution status and timestamp

#### Reference Data Endpoints

##### Get Roles

```http
GET /api/reference/roles
Authorization: Bearer {token}
```

##### Get Programs

```http
GET /api/reference/programs
Authorization: Bearer {token}
```

##### Get Divisions

```http
GET /api/reference/divisions
Authorization: Bearer {token}
```

##### Get Positions

```http
GET /api/reference/positions
Authorization: Bearer {token}
```

### Error Responses

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error information"]
}
```

#### Common HTTP Status Codes

- `200`: Success
- `201`: Created (for new resources)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `422`: Unprocessable Entity (validation failures)
- `500`: Internal Server Error

### Frontend/Android Integration Guidelines

#### 1. Authentication Management

```javascript
// Store token securely
localStorage.setItem('auth_token', response.data.token); // Web
// Or use AsyncStorage for React Native
// Or use SharedPreferences for Android

// Add to all requests
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

#### 2. Location Services

```javascript
// Get user's current location
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Use for check-in/check-out
  },
  (error) => {
    console.error('Location error:', error);
  },
  { enableHighAccuracy: true, timeout: 10000 }
);
```

#### 3. Real-time Status Updates

```javascript
// Check attendance status before showing UI
const checkTodayStatus = async () => {
  const response = await fetch('/api/attendance/status-today', { headers });
  const data = await response.json();

  // Update UI based on can_check_in and can_check_out
  updateUI(data.data);
};
```

#### 4. Photo Upload (if implemented)

```javascript
// For profile photo or attendance verification
const formData = new FormData();
formData.append('photo', photoFile);
formData.append('latitude', latitude);
formData.append('longitude', longitude);

const response = await fetch('/api/attendance/check-in-with-photo', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData
});
```

#### 5. Offline Support (Recommendations)

```javascript
// Cache essential data
const cacheEssentialData = async () => {
  // Cache user profile
  // Cache today's status
  // Cache active location info
  // Queue pending actions for when online
};

// Handle network errors gracefully
const handleNetworkError = (error) => {
  if (error.name === 'NetworkError') {
    // Show offline message
    // Queue action for retry
  }
};
```

### Pagination Parameters

Most list endpoints support pagination:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `search`: Search term (for applicable endpoints)

### Timestamp Formats

- **Input**: ISO 8601 format (`2025-06-06T09:30:00.000Z`)
- **Display**: Localized format based on timezone
- **Date Only**: `YYYY-MM-DD` format (`2025-06-06`)
- **Time Only**: `HH:MM:SS` format (`09:30:00`)

---

## ⚙️ **Environment Configuration**

### Required Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=infinite_track
DB_USER=your_username
DB_PASS=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_key_minimum_32_characters
JWT_TTL=24h

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server Configuration
PORT=3005
NODE_ENV=development

# Optional: CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 🚀 **Deployment Options**

### Development

```bash
npm run dev  # Auto-reload with nodemon
```

### Production with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit
```

### Docker Deployment

```dockerfile
FROM node:20.18.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3005
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - '3005:3005'
    environment:
      - NODE_ENV=production
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: infinite_track
      MYSQL_ROOT_PASSWORD: rootpassword
```

---

## 🧪 **Testing Strategy**

### Test Types

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete workflow testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test tests/unit/attendance.test.js

# Watch mode
npm run test:watch
```

### Test Examples

```javascript
// Unit Test
describe('Work Hour Calculation', () => {
  test('should calculate work hours correctly', () => {
    const timeIn = new Date('2025-06-06 09:00:00');
    const timeOut = new Date('2025-06-06 17:30:00');
    const workHour = calculateWorkHour(timeIn, timeOut);
    expect(workHour).toBe(8.5);
  });
});

// Integration Test
describe('POST /api/attendance/checkout/:id', () => {
  test('should checkout successfully', async () => {
    const response = await request(app)
      .post('/api/attendance/checkout/1')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        latitude: -6.1754,
        longitude: 106.8272
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 🔧 **Development Commands**

### Available Scripts

```bash
# Development
npm run dev          # Start with nodemon (auto-reload)
npm start           # Start production server

# Database
npm run migrate     # Run migrations
npm run seed        # Run seeders
npm run db:reset    # Reset database (drop + migrate + seed)

# Testing
npm test            # Run all tests
npm run test:unit   # Run unit tests
npm run test:integration # Run integration tests
npm run test:watch  # Run tests in watch mode

# Linting & Formatting
npm run lint        # Check code style
npm run lint:fix    # Fix linting issues
npm run format      # Format code with Prettier

# Documentation
npm run docs:generate # Generate API documentation
npm run docs:serve    # Serve documentation locally
```

---

## 📊 **Performance Optimization**

### Database Optimization

```sql
-- Add indexes for better query performance
CREATE INDEX idx_attendance_user_date ON attendance(user_id, attendance_date);
CREATE INDEX idx_locations_category_user ON locations(id_attendance_categories, user_id);
CREATE INDEX idx_bookings_user_date ON bookings(user_id, schedule_date, status);
```

### Caching Strategy

```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}:${req.user?.id || 'guest'}`;

    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.error('Cache error:', error);
    }

    next();
  };
};
```

---

## 🔒 **Security Checklist**

### Production Security

- [x] SSL certificate installed and configured
- [x] Environment variables secured (no .env in repository)
- [x] Database user with limited privileges
- [x] JWT secret is strong and unique
- [x] Rate limiting configured
- [x] CORS properly configured
- [x] Input validation on all endpoints
- [x] SQL injection prevention (using ORM)
- [x] XSS protection headers
- [x] Regular security updates
- [x] Monitoring and alerting setup

### Security Headers

```javascript
const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);
```

---

## 📈 **Monitoring & Logging**

### Application Logging with Winston

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

### PM2 Monitoring

```bash
# Monitor applications
pm2 monit

# View logs
pm2 logs infinite-track-backend

# Application status
pm2 status

# Restart application
pm2 restart infinite-track-backend
```

### Health Check Endpoint

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

---

## 💾 **Backup & Recovery**

### Database Backup

```bash
# Create backup
mysqldump -u username -p infinite_track > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u username -p infinite_track < backup_20250606_120000.sql
```

### Automated Backup (Cron)

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /usr/bin/mysqldump -u username -p infinite_track > /backups/infinite_track_$(date +\%Y\%m\%d).sql
```

---

## 🔍 **Troubleshooting**

### Common Issues

#### Database Connection Issues

```bash
# Check MySQL service
sudo systemctl status mysql

# Check connection
mysql -u username -p -e "SELECT 1;"
```

#### Application Issues

```bash
# Check application logs
tail -f logs/combined.log

# Check error logs only
tail -f logs/error.log

# Monitor real-time logs
pm2 logs infinite-track-backend --lines 100
```

#### Performance Issues

```bash
# Check database size
mysql -u username -p -e "
  SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
  FROM information_schema.TABLES
  WHERE table_schema = 'infinite_track'
  GROUP BY table_schema;
"

# Check slow queries
mysql -u username -p -e "SHOW PROCESSLIST;"
```

---

## 📚 **API Testing Examples**

### cURL Examples

#### Login

```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

#### Check-In

```bash
curl -X POST http://localhost:3005/api/attendance/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": -6.1754,
    "longitude": 106.8272
  }'
```

#### Check-Out

```bash
curl -X POST http://localhost:3005/api/attendance/checkout/7 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": -6.1754,
    "longitude": 106.8272
  }'
```

### Postman Collection Variables

```json
{
  "base_url": "http://localhost:3005/api",
  "access_token": "{{login_response.data.token}}",
  "user_id": "{{login_response.data.user.id}}"
}
```

---

## 🛠️ **Maintenance Schedule**

### Regular Maintenance Tasks

- **Weekly**: Check application logs for errors
- **Weekly**: Monitor database performance and size
- **Monthly**: Update dependencies (`npm update`)
- **Monthly**: Review and rotate JWT secrets
- **Quarterly**: Security audit and vulnerability scan
- **Quarterly**: Performance optimization review

---

## 📞 **Support Information**

### Contact Information

- **Development Team**: dev@infinitelearning.id
- **System Admin**: admin@infinitelearning.id
- **Emergency**: +62-xxx-xxxx-xxxx

### Useful Links

- **API Documentation**: `http://localhost:3005/docs`
- **Health Check**: `http://localhost:3005/health`
- **GitHub Repository**: `<repository-url>`

---

## 📋 **Implementation Status**

### ✅ **Completed Features**

1. **Multi-mode Attendance System** - WFO, WFH, WFA support
2. **Flexible Geofencing** - Distance-based location validation
3. **Face Photo Upload** - Cloudinary integration for photo storage
4. **JWT Authentication** - Secure token-based authentication
5. **Work Hour Calculation** - Automatic calculation with timezone support
6. **Booking System** - Location booking for WFA mode
7. **Role-Based Access Control** - Admin, Manager, Employee, Internship roles
8. **Comprehensive API** - RESTful API with proper validation
9. **Error Handling** - Consistent error responses
10. **Transaction Safety** - Database transaction management
11. **Complete Documentation** - Technical and API documentation
12. **Testing Framework** - Unit and integration tests setup
13. **Production Deployment** - Docker and PM2 configurations
14. **Monitoring & Logging** - Winston logging and PM2 monitoring
15. **Security Implementation** - Helmet, CORS, rate limiting
16. **Auto Checkout System** - Cron job-based automatic checkout functionality

### 🔧 **Recent Fixes & Improvements**

1. **Fixed Validation Middleware** - Resolved express-validator issues
2. **Fixed Work Hour Calculation** - Corrected timezone handling (UTC+7)
3. **Fixed Database Queries** - Changed `booking_date` to `schedule_date`
4. **Enhanced Error Handling** - Improved error messages and status codes
5. **Security Hardening** - Added security headers and rate limiting
6. **Performance Optimization** - Added database indexes and caching
7. **Documentation Completion** - Created comprehensive documentation set
8. **Auto Checkout Implementation** - Added cron job for automatic checkout
9. **Past Data Processing** - Utility to process historical attendance records
10. **Admin Management Tools** - Endpoints for auto checkout configuration
11. **Booking Conflict Validation** - Prevents duplicate bookings on same date

### 🆕 **Auto Checkout System Features**

1. **Cron Job Automation** - Runs every minute checking for auto checkout time
2. **Configurable Time** - Admin-configurable auto checkout time (default: 17:00:00)
3. **Past Data Processing** - Processes historical records that were never checked out
4. **Jakarta Timezone Support** - All operations use Asia/Jakarta timezone (UTC+7)
5. **Transaction Safety** - All auto checkout operations use database transactions
6. **Comprehensive Logging** - Detailed logging for monitoring and debugging
7. **Admin Controls** - Setup, manual trigger, and configuration endpoints
8. **Work Hour Calculation** - Automatic work hour calculation for auto checkout
9. **Notes Addition** - Automatic notes added to indicate system checkout
10. **Error Handling** - Individual failure handling without stopping batch processing

### 🎯 **Current Status**

- **Backend API**: 100% functional and documented
- **Authentication**: Fully implemented with JWT
- **Attendance System**: Complete with all work modes
- **Auto Checkout**: Fully functional with cron job automation
- **Database Design**: Optimized with proper relationships
- **Testing**: Framework setup with example tests
- **Deployment**: Production-ready configurations
- **Documentation**: Complete technical and API reference with auto checkout details

### 📊 **System Statistics**

- **Total API Endpoints**: 25+ endpoints
- **Authentication Methods**: JWT with role-based access
- **Work Modes Supported**: 3 (WFO, WFH, WFA)
- **User Roles**: 4 (Admin, Manager, Employee, Internship)
- **Database Tables**: 15+ tables with proper relationships
- **Timezone Support**: Asia/Jakarta (UTC+7)
- **Auto Checkout**: Configurable time with historical processing
- **File Upload**: Cloudinary integration for photos
- **Geofencing**: Configurable radius per location

---

## 📄 **Version Information**

- **Backend Version**: 0.1.0
- **Node.js Version**: 20.18.0+
- **API Version**: v1
- **Documentation Version**: 2.0.0
- **Database Schema Version**: Latest (June 2025)
- **Auto Checkout System**: v1.0.0 (June 2025)
- **Last Updated**: June 9, 2025

---

## 🔗 **Frontend & Mobile Integration Guide**

### Environment Configuration for Different Platforms

#### Web Frontend (React/Vue/Angular)

```javascript
// Environment variables
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3005/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Axios configuration
import axios from 'axios';

const apiClient = axios.create(API_CONFIG);

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);
```

#### Android Native (Java/Kotlin)

```java
// Retrofit configuration
public class ApiConfig {
    private static final String BASE_URL = "http://10.0.2.2:3005/api/"; // For emulator
    // private static final String BASE_URL = "http://192.168.1.100:3005/api/"; // For real device

    public static Retrofit getRetrofit() {
        OkHttpClient client = new OkHttpClient.Builder()
            .addInterceptor(new AuthInterceptor())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();

        return new Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build();
    }
}

// Auth interceptor
public class AuthInterceptor implements Interceptor {
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request originalRequest = chain.request();
        String token = SharedPrefsManager.getToken();

        if (token != null) {
            Request authorizedRequest = originalRequest.newBuilder()
                .header("Authorization", "Bearer " + token)
                .build();
            return chain.proceed(authorizedRequest);
        }

        return chain.proceed(originalRequest);
    }
}
```

#### React Native

```javascript
// API configuration
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3005/api' // Android emulator
  : 'https://your-production-api.com/api';

class ApiService {
  static async makeRequest(endpoint, options = {}) {
    const token = await AsyncStorage.getItem('auth_token');

    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          // Navigate to login screen
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}
```

### Location Services Integration

#### Web (HTML5 Geolocation)

```javascript
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache for 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(new Error(`Location error: ${error.message}`));
      },
      options
    );
  });
};

// Usage in check-in
const handleCheckIn = async (categoryId, notes = '') => {
  try {
    const location = await getCurrentLocation();

    const response = await apiClient.post('/attendance/check-in', {
      category_id: categoryId,
      latitude: location.latitude,
      longitude: location.longitude,
      notes: notes
    });

    return response;
  } catch (error) {
    console.error('Check-in failed:', error);
    throw error;
  }
};
```

#### Android (Fused Location Provider)

```java
// Location service
public class LocationService {
    private FusedLocationProviderClient fusedLocationClient;

    public LocationService(Context context) {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(context);
    }

    public void getCurrentLocation(LocationCallback callback) {
        if (ActivityCompat.checkSelfPermission(context,
                Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            callback.onError("Location permission not granted");
            return;
        }

        LocationRequest locationRequest = LocationRequest.create()
            .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY)
            .setInterval(10000)
            .setFastestInterval(5000);

        fusedLocationClient.requestLocationUpdates(locationRequest,
            new com.google.android.gms.location.LocationCallback() {
                @Override
                public void onLocationResult(LocationResult locationResult) {
                    Location location = locationResult.getLastLocation();
                    if (location != null) {
                        callback.onSuccess(location.getLatitude(), location.getLongitude());
                    }
                }
            }, Looper.getMainLooper());
    }

    public interface LocationCallback {
        void onSuccess(double latitude, double longitude);
        void onError(String error);
    }
}
```

#### React Native (react-native-geolocation-service)

```javascript
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const requestLocationPermission = async () => {
  const permission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

  const result = await request(permission);
  return result === RESULTS.GRANTED;
};

const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  });
};
```

### State Management Patterns

#### React (Context API + Hooks)

```javascript
// Auth Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        const profile = await apiClient.get('/auth/profile');
        setUser(profile.data);
        setToken(storedToken);
      }
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('auth_token', response.data.token);
    setUser(response.data.user);
    setToken(response.data.token);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### Android (MVVM Pattern)

```java
// AttendanceViewModel
public class AttendanceViewModel extends ViewModel {
    private MutableLiveData<AttendanceStatus> attendanceStatus = new MutableLiveData<>();
    private MutableLiveData<Boolean> loading = new MutableLiveData<>();
    private AttendanceRepository repository;

    public AttendanceViewModel() {
        repository = new AttendanceRepository();
    }

    public LiveData<AttendanceStatus> getAttendanceStatus() {
        return attendanceStatus;
    }

    public void checkTodayStatus() {
        loading.setValue(true);
        repository.getTodayStatus(new ApiCallback<AttendanceStatus>() {
            @Override
            public void onSuccess(AttendanceStatus status) {
                attendanceStatus.setValue(status);
                loading.setValue(false);
            }

            @Override
            public void onError(String error) {
                // Handle error
                loading.setValue(false);
            }
        });
    }

    public void checkIn(int categoryId, double latitude, double longitude, String notes) {
        loading.setValue(true);
        CheckInRequest request = new CheckInRequest(categoryId, latitude, longitude, notes);

        repository.checkIn(request, new ApiCallback<CheckInResponse>() {
            @Override
            public void onSuccess(CheckInResponse response) {
                // Refresh status
                checkTodayStatus();
            }

            @Override
            public void onError(String error) {
                loading.setValue(false);
                // Handle error
            }
        });
    }
}
```

### Real-time Features Implementation

#### WebSocket for Real-time Updates (Optional)

```javascript
// WebSocket service for real-time attendance updates
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    this.ws = new WebSocket(`ws://localhost:3005/ws?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect(token);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'ATTENDANCE_UPDATE':
        // Handle attendance status change
        break;
      case 'AUTO_CHECKOUT':
        // Handle auto checkout notification
        break;
    }
  }

  reconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(token);
      }, 5000);
    }
  }
}
```

### Offline Support Implementation

#### Service Worker for Web

```javascript
// service-worker.js
const CACHE_NAME = 'infinite-track-v1';
const urlsToCache = ['/', '/static/js/bundle.js', '/static/css/main.css', '/manifest.json'];

// Cache essential data
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});

// Sync attendance data when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncPendingAttendance());
  }
});

async function syncPendingAttendance() {
  const pendingData = await getPendingAttendanceFromIndexedDB();
  for (const attendance of pendingData) {
    try {
      await submitAttendance(attendance);
      await removePendingAttendance(attendance.id);
    } catch (error) {
      console.error('Sync failed for attendance:', attendance.id);
    }
  }
}
```

#### React Native Offline Queue

```javascript
import NetInfo from '@react-native-netinfo/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OfflineManager {
  constructor() {
    this.isOnline = true;
    this.pendingRequests = [];
    this.init();
  }

  init() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      if (wasOffline && this.isOnline) {
        this.processPendingRequests();
      }
    });
  }

  async queueRequest(request) {
    const requests = await this.getPendingRequests();
    requests.push({
      ...request,
      timestamp: Date.now(),
      id: generateUniqueId()
    });
    await AsyncStorage.setItem('pending_requests', JSON.stringify(requests));
  }

  async processPendingRequests() {
    const requests = await this.getPendingRequests();

    for (const request of requests) {
      try {
        await ApiService.makeRequest(request.endpoint, request.options);
        await this.removePendingRequest(request.id);
      } catch (error) {
        console.error('Failed to process pending request:', error);
      }
    }
  }

  async getPendingRequests() {
    const requests = await AsyncStorage.getItem('pending_requests');
    return requests ? JSON.parse(requests) : [];
  }
}
```

### Push Notifications

#### Web Push Notifications

```javascript
// Push notification service
class PushNotificationService {
  async requestPermission() {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPush() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Send subscription to backend
    await apiClient.post('/notifications/subscribe', {
      subscription: subscription
    });
  }

  showNotification(title, options) {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}

// Auto checkout notification
const notifyAutoCheckout = () => {
  pushService.showNotification('Auto Checkout', {
    body: 'You have been automatically checked out at 17:00',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  });
};
```

#### Android Push Notifications (FCM)

```java
// FirebaseMessagingService
public class AttendanceFirebaseMessagingService extends FirebaseMessagingService {
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        String title = remoteMessage.getNotification().getTitle();
        String body = remoteMessage.getNotification().getBody();

        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }
}
```

---

## 🔍 **Debugging & Development Tools**

### API Testing Tools

#### Postman Collection

```json
{
  "info": {
    "name": "InfiniteTrack API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3005/api"
    },
    {
      "key": "authToken",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@infinite.com\",\n  \"password\": \"admin123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          }
        }
      ]
    }
  ]
}
```

#### cURL Commands for Testing

```bash
# Login and get token
$token = (Invoke-RestMethod -Uri "http://localhost:3005/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@infinite.com","password":"admin123"}').data.token

# Check today's attendance status
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/status-today" -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json -Depth 10

# Check-in
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/check-in" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $token"} -Body '{"category_id":1,"latitude":-6.1754,"longitude":106.8272,"notes":"Test check-in"}'

# Get attendance history
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/history?page=1&limit=5" -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json -Depth 10

# Setup auto checkout (Admin only)
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/setup-auto-checkout" -Method POST -Headers @{"Authorization"="Bearer $token"}

# Manual auto checkout trigger (Admin only)
Invoke-RestMethod -Uri "http://localhost:3005/api/attendance/manual-auto-checkout" -Method POST -Headers @{"Authorization"="Bearer $token"}
```

### Development Scripts

#### Package.json Scripts Update

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "migrate": "sequelize-cli db:migrate --migrations-path src/models/migrations",
    "seed": "sequelize-cli db:seed:all --seeders-path src/models/seeders",
    "db:reset": "sequelize-cli db:drop && sequelize-cli db:create && npm run migrate && npm run seed",
    "docker:build": "docker build -t infinite-track-be .",
    "docker:run": "docker run -p 3005:3005 infinite-track-be",
    "pm2:start": "pm2 start ecosystem.config.js --env production",
    "pm2:stop": "pm2 stop ecosystem.config.js",
    "pm2:restart": "pm2 restart ecosystem.config.js",
    "logs": "pm2 logs infinite-track-backend",
    "backup:db": "mysqldump -u %DB_USER% -p%DB_PASS% %DB_NAME% > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
  }
}
```

---

**This comprehensive documentation recap provides everything needed to understand, deploy, maintain, and integrate with the InfiniteTrack backend system for both web frontend and Android mobile applications. All documentation reflects the latest implementation including the auto checkout system and is current as of June 9, 2025.**
