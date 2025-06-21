# Check-In Controller Revision - Implementation Summary

## Overview

This document summarizes the comprehensive revision and improvement of the `checkIn` function in `src/controllers/attendance.controller.js`.

## Key Improvements Made

### 1. **Utility Functions Created (`src/utils/settings.js`)**

- **`getAttendanceSettings()`**: Helper to fetch and process dynamic settings from database
- **`getJakartaTime()`**: Helper to get current time in Jakarta timezone (UTC+7)
- **`isWithinWorkingHours()`**: Helper to check if current time is within working hours
- **`determineAttendanceStatus()`**: Helper to determine attendance status (ontime vs late)
- **`timeToMinutes()`**: Helper to convert time strings to minutes for calculations

### 2. **Enhanced Validation Layer Architecture**

#### **First Layer - Business Rules & Time Validation**

1. **Duplication Check**: Prevents multiple check-ins on the same day
2. **Holiday/Weekend Check**: Uses `date-holidays` library with dynamic region settings
3. **Working Hours Check**: Validates check-in time against configured business hours

#### **Second Layer - Geofencing Validation**

- **WFO (category_id = 1)**: Validates against hardcoded office location
- **WFH (category_id = 2)**: Validates against user's registered home location
- **WFA (category_id = 3)**: Validates against approved booking location with comprehensive booking validation

### 3. **Dynamic Settings Integration**

The function now uses settings from the database instead of hardcoded values:

- `attendance.checkin.start_time` (default: 08:00:00)
- `attendance.checkin.end_time` (default: 18:00:00)
- `attendance.checkin.late_time` (default: 09:00:00)
- `workday.holiday_checkin_enabled` (default: false)
- `workday.weekend_checkin_enabled` (default: false)
- `workday.holiday_region` (default: ID)

### 4. **Comprehensive WFA Booking Validation**

For Work From Anywhere (WFA) check-ins, the function validates:

- Booking ID is provided
- Booking exists in database
- Booking belongs to the current user
- Booking status is approved (status = 1)
- Booking schedule date matches today
- User location is within booking location radius

### 5. **Enhanced Error Handling**

- Database transactions with proper rollback on errors
- Specific error messages for each validation failure
- Consistent JSON response format
- Proper HTTP status codes

### 6. **Code Structure Improvements**

- Modular function design with clear separation of concerns
- Comprehensive documentation and comments
- Better variable naming and code organization
- Reusable utility functions

## API Endpoint Usage

### **Request Format**

```http
POST /api/attendance/check-in
Authorization: Bearer <token>
Content-Type: application/json

{
  "category_id": 1|2|3,
  "latitude": -6.2088,
  "longitude": 106.8456,
  "notes": "Optional notes",
  "booking_id": 123 // Required only for WFA (category_id = 3)
}
```

### **Response Format**

```json
{
  "success": true,
  "data": {
    "id_attendance": 456,
    "user_id": 789,
    "category_id": 1,
    "status_id": 1,
    "location_id": null,
    "booking_id": null,
    "time_in": "2025-06-17T02:30:00.000Z",
    "attendance_date": "2025-06-17",
    "notes": "",
    "created_at": "2025-06-17T02:30:00.000Z",
    "updated_at": "2025-06-17T02:30:00.000Z"
  },
  "message": "Check-in berhasil"
}
```

## Validation Rules

### **Input Validation (Middleware)**

- `category_id`: Required, must be 1 (WFO), 2 (WFH), or 3 (WFA)
- `latitude`: Required, valid latitude (-90 to 90), cannot be 0
- `longitude`: Required, valid longitude (-180 to 180), cannot be 0
- `notes`: Optional, max 500 characters
- `booking_id`: Optional for WFO/WFH, required for WFA

### **Business Logic Validation**

1. **No duplicate check-ins** on the same day
2. **Holiday/Weekend restrictions** based on settings
3. **Working hours compliance** (configurable start/end times)
4. **Geofencing validation** for all attendance categories
5. **Booking validation** for WFA (approved, valid date, ownership)

## Error Scenarios

| Error                   | HTTP Status | Message                                             |
| ----------------------- | ----------- | --------------------------------------------------- |
| Duplicate check-in      | 400         | "Anda sudah melakukan check-in hari ini."           |
| Holiday/Weekend         | 400         | "Check-in tidak diizinkan pada hari libur."         |
| Outside working hours   | 400         | "Check-in hanya bisa dilakukan pada jam kerja."     |
| Outside geofence        | 400         | "Anda berada di luar radius lokasi yang diizinkan." |
| Missing booking for WFA | 400         | "Booking ID wajib untuk WFA."                       |
| Invalid booking         | 400         | Various booking-specific messages                   |
| Invalid category        | 400         | "Kategori absensi tidak valid."                     |

## Database Changes

### **Attendance Record Structure**

```sql
{
  user_id: INTEGER,
  category_id: INTEGER (1=WFO, 2=WFH, 3=WFA),
  status_id: INTEGER (1=ontime, 2=late),
  location_id: INTEGER (nullable, for WFH/WFA),
  booking_id: INTEGER (nullable, for WFA only),
  time_in: DATETIME,
  attendance_date: DATE,
  notes: TEXT,
  created_at: DATETIME,
  updated_at: DATETIME
}
```

## Configuration Requirements

### **WFO Location (Hardcoded)**

```javascript
const WFO_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  radius: 100,
  description: 'Kantor Pusat Jakarta',
  address: 'Jl. Sudirman No. 1, Jakarta Pusat'
};
```

### **Required Database Settings**

- `attendance.checkin.start_time`
- `attendance.checkin.end_time`
- `attendance.checkin.late_time`
- `workday.holiday_checkin_enabled`
- `workday.weekend_checkin_enabled`
- `workday.holiday_region`

## Dependencies

- `sequelize`: Database ORM and transactions
- `date-holidays`: Holiday detection library
- `express-validator`: Input validation
- Custom utilities: `geofence.js`, `settings.js`

## Security Features

- JWT token authentication required
- User isolation (users can only check-in for themselves)
- Database transactions for data consistency
- Input sanitization and validation
- Rate limiting through single daily check-in rule

## Performance Considerations

- Single database transaction for consistency
- Efficient query patterns with proper indexes
- Minimal external API calls (holiday library uses local data)
- Configurable settings cached per request

This revision provides a robust, scalable, and maintainable check-in system that handles all business requirements while maintaining security and data integrity.
