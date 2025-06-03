# Reference Data Endpoints - Technical Configuration

## 📋 Implementation Summary

✅ **COMPLETED**: 4 Reference Data Endpoints for Frontend Integration

### Endpoints Implemented

1. `GET /api/roles` - Get all roles for dropdown
2. `GET /api/programs` - Get all programs for dropdown
3. `GET /api/positions` - Get all positions (with optional program filter)
4. `GET /api/divisions` - Get all divisions for dropdown

---

## 🏗️ Architecture & Files

### Controller Layer

**File**: `src/controllers/referenceData.controller.js`

- ✅ `getRoles()` - Fetch all roles sorted by name
- ✅ `getPrograms()` - Fetch all programs sorted by name
- ✅ `getPositions()` - Fetch positions with optional program_id filter
- ✅ `getDivisions()` - Fetch all divisions sorted by name

### Routes Layer

**File**: `src/routes/referenceData.routes.js`

- ✅ Protected with `verifyToken` middleware
- ✅ Restricted to Admin/Management roles only
- ✅ Proper route definitions with middleware chain

### Route Registration

**File**: `src/routes/index.js`

- ✅ Reference data routes registered as `/api/*`
- ✅ Integrated with main router

---

## 🔐 Security Configuration

### Authentication & Authorization

```javascript
// Middleware chain for all endpoints:
verifyToken -> roleGuard(['Admin', 'Management']) -> controller
```

### Access Control

- **Required**: Valid JWT token in Authorization header
- **Roles**: Only Admin and Management can access
- **Format**: `Authorization: Bearer <jwt_token>`

---

## 📊 Data Transformation

### Input Sources

- `roles` table → `id_roles`, `role_name`
- `programs` table → `id_programs`, `program_name`
- `positions` table → `id_positions`, `position_name`, `id_programs`
- `divisions` table → `id_divisions`, `division_name`

### Output Format (Standardized)

```javascript
{
  success: true,
  data: [
    {
      id: number,    // Primary key from database
      name: string   // Display name for frontend
    }
  ],
  message: string
}
```

---

## 🔍 Query Features

### Sorting

- All endpoints return data sorted by name (ASC)
- Consistent alphabetical ordering for UI dropdowns

### Filtering

- **Positions endpoint**: Supports `program_id` query parameter
- Example: `/api/positions?program_id=1`
- Returns only positions belonging to specified program

---

## 💻 Technical Implementation

### Database Queries

```javascript
// Example: Get roles
const roles = await Role.findAll({
  order: [['role_name', 'ASC']]
});

// Example: Get filtered positions
const positions = await Position.findAll({
  where: program_id ? { id_programs: program_id } : {},
  order: [['position_name', 'ASC']]
});
```

### Error Handling

- ✅ Try-catch blocks in all controllers
- ✅ Structured error logging with Winston
- ✅ Consistent error response format
- ✅ Express error middleware integration

### Logging

```javascript
// Success logging
logger.info(`Roles fetched successfully, returned ${count} roles`);

// Error logging
logger.error(`Error fetching roles: ${error.message}`, { stack: error.stack });
```

---

## 🧪 Testing

### Test Coverage

- ✅ Authentication testing (valid token)
- ✅ Authorization testing (role restrictions)
- ✅ Unauthorized access testing (no token)
- ✅ Data retrieval testing (all endpoints)
- ✅ Query parameter testing (positions filter)

### Test File

**Location**: `test_reference_data.js`
**Execution**: `node test_reference_data.js`

---

## 📈 Performance Considerations

### Database Optimization

- Simple SELECT queries with ORDER BY
- No complex JOINs required
- Lightweight data transformation

### Caching Recommendations

- Data changes infrequently - ideal for caching
- Frontend can cache for 5-10 minutes
- Consider Redis caching for high-traffic scenarios

---

## 🔄 Frontend Integration

### JavaScript/TypeScript

```typescript
interface ReferenceDataItem {
  id: number;
  name: string;
}

interface ReferenceDataResponse {
  success: boolean;
  data: ReferenceDataItem[];
  message: string;
}
```

### React Hook Pattern

```javascript
const useReferenceData = (token) => {
  // Implementation provided in documentation
};
```

### Vue.js Composable Pattern

```javascript
const useReferenceData = () => {
  // Similar implementation for Vue
};
```

---

## 🚀 Deployment Notes

### Environment Variables

- No additional environment variables required
- Uses existing database connection
- Uses existing JWT configuration

### Dependencies

- No new dependencies added
- Uses existing Sequelize models
- Uses existing middleware stack

---

## 📋 Developer Checklist

### Backend (Completed ✅)

- [x] Controller functions implemented
- [x] Routes defined and protected
- [x] Middleware integration complete
- [x] Error handling implemented
- [x] Logging configured
- [x] Testing completed

### Frontend Integration (Pending)

- [ ] Implement API service layer
- [ ] Create reusable hooks/composables
- [ ] Add error handling for failed requests
- [ ] Implement loading states
- [ ] Add caching strategy
- [ ] Test with actual form integration

---

## 📞 API Endpoints Summary

| Endpoint         | Method | Auth | Role       | Query Params  | Description            |
| ---------------- | ------ | ---- | ---------- | ------------- | ---------------------- |
| `/api/roles`     | GET    | ✅   | Admin/Mgmt | -             | All roles              |
| `/api/programs`  | GET    | ✅   | Admin/Mgmt | -             | All programs           |
| `/api/positions` | GET    | ✅   | Admin/Mgmt | `program_id?` | All/filtered positions |
| `/api/divisions` | GET    | ✅   | Admin/Mgmt | -             | All divisions          |

---

## 🎯 Next Steps for Frontend Team

1. **Integration**: Use provided documentation to integrate endpoints
2. **Form Building**: Implement user creation form with dropdowns
3. **Error Handling**: Handle authentication and authorization errors
4. **User Experience**: Add loading states and error messages
5. **Testing**: Test with various user roles and edge cases

**Status**: ✅ **READY FOR FRONTEND INTEGRATION**
