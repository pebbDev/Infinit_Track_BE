# Reference Data API Endpoints

Dokumentasi lengkap untuk endpoint reference data yang digunakan untuk mengambil data dropdown/select options.

## Base URL

```
http://localhost:3005/api
```

## Authentication

Semua endpoint memerlukan:

- **Authorization Header**: `Bearer <token>`
- **Role Access**: Admin atau Management saja

## Response Format

Semua endpoint menggunakan format response yang konsisten:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Nama Item"
    }
  ],
  "message": "Data fetched successfully"
}
```

---

## 1. GET /api/roles

Mengambil semua data roles untuk dropdown selection.

### Request

```http
GET /api/roles
Authorization: Bearer <your_jwt_token>
```

### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Admin"
    },
    {
      "id": 2,
      "name": "Management"
    },
    {
      "id": 3,
      "name": "Employee"
    }
  ],
  "message": "Roles fetched successfully"
}
```

### Contoh JavaScript

```javascript
// Fetch roles for dropdown
const response = await fetch('/api/roles', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  const roles = result.data; // Array of {id, name}
}
```

---

## 2. GET /api/programs

Mengambil semua data programs untuk dropdown selection.

### Request

```http
GET /api/programs
Authorization: Bearer <your_jwt_token>
```

### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Teknik Informatika"
    },
    {
      "id": 2,
      "name": "Sistem Informasi"
    },
    {
      "id": 3,
      "name": "Teknik Komputer"
    }
  ],
  "message": "Programs fetched successfully"
}
```

### Contoh JavaScript

```javascript
// Fetch programs for dropdown
const response = await fetch('/api/programs', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  const programs = result.data; // Array of {id, name}
}
```

---

## 3. GET /api/positions

Mengambil data positions untuk dropdown selection. Support filtering berdasarkan program.

### Request

```http
GET /api/positions
Authorization: Bearer <your_jwt_token>

# Dengan filter program (opsional)
GET /api/positions?program_id=1
Authorization: Bearer <your_jwt_token>
```

### Query Parameters

| Parameter  | Type    | Required | Description                                   |
| ---------- | ------- | -------- | --------------------------------------------- |
| program_id | integer | No       | Filter positions berdasarkan program tertentu |

### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Dosen"
    },
    {
      "id": 2,
      "name": "Asisten Dosen"
    },
    {
      "id": 3,
      "name": "Staff Akademik"
    }
  ],
  "message": "Positions fetched successfully"
}
```

### Contoh JavaScript

```javascript
// Fetch all positions
const response = await fetch('/api/positions', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Fetch positions for specific program
const responseFiltered = await fetch('/api/positions?program_id=1', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  const positions = result.data; // Array of {id, name}
}
```

---

## 4. GET /api/divisions

Mengambil semua data divisions untuk dropdown selection.

### Request

```http
GET /api/divisions
Authorization: Bearer <your_jwt_token>
```

### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Akademik"
    },
    {
      "id": 2,
      "name": "Keuangan"
    },
    {
      "id": 3,
      "name": "SDM"
    },
    {
      "id": 4,
      "name": "IT"
    }
  ],
  "message": "Divisions fetched successfully"
}
```

### Contoh JavaScript

```javascript
// Fetch divisions for dropdown
const response = await fetch('/api/divisions', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
if (result.success) {
  const divisions = result.data; // Array of {id, name}
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden

```json
{
  "message": "Access denied. Insufficient permissions."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

## Contoh Penggunaan Lengkap untuk Form Create User

```javascript
class UserFormService {
  constructor(token) {
    this.token = token;
    this.baseUrl = '/api';
  }

  async fetchAllReferenceData() {
    try {
      const [roles, programs, positions, divisions] = await Promise.all([
        this.fetchRoles(),
        this.fetchPrograms(),
        this.fetchPositions(),
        this.fetchDivisions()
      ]);

      return {
        roles: roles.data,
        programs: programs.data,
        positions: positions.data,
        divisions: divisions.data
      };
    } catch (error) {
      console.error('Error fetching reference data:', error);
      throw error;
    }
  }

  async fetchRoles() {
    const response = await fetch(`${this.baseUrl}/roles`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async fetchPrograms() {
    const response = await fetch(`${this.baseUrl}/programs`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async fetchPositions(programId = null) {
    const url = programId
      ? `${this.baseUrl}/positions?program_id=${programId}`
      : `${this.baseUrl}/positions`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async fetchDivisions() {
    const response = await fetch(`${this.baseUrl}/divisions`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return await response.json();
  }
}

// Penggunaan
const userFormService = new UserFormService(userToken);

// Load semua data reference saat form dimuat
const referenceData = await userFormService.fetchAllReferenceData();

// Update positions ketika program berubah
const filteredPositions = await userFormService.fetchPositions(selectedProgramId);
```

---

## Notes untuk Developer FE

1. **Caching**: Pertimbangkan untuk melakukan caching data reference karena jarang berubah
2. **Error Handling**: Selalu handle error response dengan baik
3. **Loading State**: Tampilkan loading indicator saat fetch data
4. **Dependency**: Positions bisa difilter berdasarkan program yang dipilih
5. **Authorization**: Pastikan token selalu valid dan handle token expiry
6. **Data Format**: Semua data dikembalikan dalam format `{id, name}` untuk konsistensi
7. **Sorting**: Data sudah diurutkan berdasarkan nama (ASC) dari backend

## Testing

Endpoint telah ditest dan berjalan dengan baik. Gunakan tools seperti Postman atau browser dev tools untuk testing lebih lanjut.
