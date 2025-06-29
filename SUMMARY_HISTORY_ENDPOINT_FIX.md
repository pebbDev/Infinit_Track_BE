# Summary and History Endpoint Configuration Fix

## Overview

Fixed the summary and history endpoint responses to properly support the new dynamic status logic that determines attendance status (`early`, `ontime`, `late`) based on configurable time rules from the database.

## Changes Made

### 1. Attendance Controller - `getAttendanceHistory` Function

**File:** `src/controllers/attendance.controller.js`

**Updated Summary Object:**

```javascript
const summary = {
  total_ontime: 0,
  total_late: 0,
  total_early: 0, // ✅ NEW FIELD ADDED
  total_alpha: 0,
  total_wfo: 0,
  total_wfa: 0
};
```

**Updated Status Mapping:**

```javascript
// Map status counts with dynamic status logic: 1=ontime, 2=late, 4=early, 3=alpha
summaryByStatus.forEach((item) => {
  const count = parseInt(item.count);

  switch (item.status_id) {
    case 1:
      summary.total_ontime = count;
      break;
    case 2:
      summary.total_late = count;
      break;
    case 4: // ✅ NEW STATUS MAPPING
      summary.total_early = count;
      break;
    case 3:
      summary.total_alpha = count;
      break;
  }
});
```

### 2. Summary Controller - `getSummaryReport` Function

**File:** `src/controllers/summary.controller.js`

**Updated Summary Object:**

```javascript
const summary = {
  total_ontime: 0,
  total_late: 0,
  total_early: 0, // ✅ NEW FIELD ADDED
  total_alpha: 0,
  total_wfo: 0,
  total_wfh: 0,
  total_wfa: 0
};
```

**Updated Status Name Mapping:**

```javascript
switch (statusName.toLowerCase()) {
  case 'tepat waktu':
  case 'ontime':
    summary.total_ontime = total;
    break;
  case 'terlambat':
  case 'late':
    summary.total_late = total;
    break;
  case 'early': // ✅ NEW STATUS MAPPING
  case 'lebih awal':
    summary.total_early = total;
    break;
  case 'alpa':
  case 'alpha':
    summary.total_alpha = total;
    break;
}
```

## API Response Structure

### Attendance History Endpoint

**Endpoint:** `GET /api/attendance/history`
**Parameters:** `period` (daily, weekly, monthly, all), `page`, `limit`

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_ontime": 5,
      "total_late": 2,
      "total_early": 1,     // ✅ NEW FIELD
      "total_alpha": 0,
      "total_wfo": 6,
      "total_wfa": 2
    },
    "attendances": [...],
    "pagination": {...}
  },
  "message": "Riwayat absensi berhasil diambil"
}
```

### Summary Report Endpoint

**Endpoint:** `GET /api/summary`
**Parameters:** `period` (daily, weekly, monthly, all), `page`, `limit`

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_ontime": 5,
      "total_late": 2,
      "total_early": 1,     // ✅ NEW FIELD
      "total_alpha": 0,
      "total_wfo": 6,
      "total_wfh": 0,
      "total_wfa": 2
    },
    "report": [...],
    "metadata": {...}
  }
}
```

## Status Logic Mapping

Based on the database configuration and new dynamic logic:

| Status ID | Status Name | Condition                                         | Field in Summary |
| --------- | ----------- | ------------------------------------------------- | ---------------- |
| 1         | ontime      | checkin.start_time ≤ check-in ≤ checkin.late_time | `total_ontime`   |
| 2         | late        | check-in > checkin.late_time                      | `total_late`     |
| 4         | early       | check-in < checkin.start_time                     | `total_early`    |
| 3         | alpha       | No check-in record                                | `total_alpha`    |

## Database Settings

The dynamic logic uses these settings from the `settings` table:

- `checkin.start_time` (default: '08:00:00')
- `checkin.late_time` (default: '10:00:00')

**Example Logic:**

- Check-in at 07:45 → **Early** (status_id: 4)
- Check-in at 08:30 → **On Time** (status_id: 1)
- Check-in at 10:15 → **Late** (status_id: 2)

## Testing

Created test scripts to validate the changes:

- `test-summary-logic.mjs` - Tests the summary calculation logic
- `test-api-endpoints.mjs` - Tests the actual API endpoints

Run tests with:

```bash
node test-summary-logic.mjs
```

## Frontend Integration

Frontend applications consuming these endpoints should now expect and handle the new `total_early` field in summary objects. The field represents the count of attendance records where users checked in before the configured start time.

## Backward Compatibility

The changes are backward compatible - existing fields remain unchanged, only the new `total_early` field is added to the response structure.
