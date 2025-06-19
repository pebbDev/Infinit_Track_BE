# 📸 Konfigurasi Photo API - Cloudinary Integration

## 🔄 **Perubahan Utama untuk Frontend**

### 1. **Response Format Changes**

```json
// SEBELUM (Local Storage)
{
  "photo": "/uploads/face/face-1234567890.jpg",
  "photo_updated_at": "2025-06-19T10:30:00.000Z"
}

// SESUDAH (Cloudinary)
{
  "photo": "https://res.cloudinary.com/dfbcj6o7j/image/upload/v1718793600/user_photos/abc123def456.jpg",
  "photo_updated_at": "2025-06-19T10:30:00.000Z"
}
```

### 2. **File Upload Specifications**

#### **Form Data Requirements:**

- **Field Name**: `face_photo` (wajib sama persis)
- **File Types**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- **Max Size**: **20MB** (sebelumnya 100MB)
- **Encoding**: `multipart/form-data`

#### **Example Frontend Upload:**

```javascript
const formData = new FormData();
formData.append('face_photo', fileInput.files[0]);

// Untuk register
formData.append('email', 'user@example.com');
formData.append('password', 'password123');
// ... other fields

fetch('/api/auth/register', {
  method: 'POST',
  body: formData
});

// Untuk update photo
fetch('/api/users/123/photo', {
  method: 'PUT',
  headers: {
    Authorization: 'Bearer ' + token
  },
  body: formData
});
```

## 🛠 **API Endpoints**

### **1. Register User (Create)**

```
POST /api/auth/register
Content-Type: multipart/form-data

Fields:
- face_photo: File (required)
- email: string (required)
- password: string (required)
- full_name: string (required)
- nipNim: string (required)
- phoneNumber: string (required)
- id_roles: number (required)
- id_position: number (required)
- id_programs: number (required)
- id_divisions: number (optional)
- latitude: number (required for WFH location)
- longitude: number (required for WFH location)
- radius: number (optional, default: 100)
- description: string (optional)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "full_name": "John Doe",
      "role": {
        "id": 2,
        "name": "Employee"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    "location": {
      "location_id": 456,
      "latitude": -6.2,
      "longitude": 106.816666,
      "radius": 100,
      "description": "Default WFH Location"
    }
  },
  "message": "Registrasi berhasil"
}
```

### **2. Login**

```
POST /api/auth/login

Response includes photo URL:
{
  "success": true,
  "data": {
    "id": 123,
    "full_name": "John Doe",
    "email": "john@example.com",
    "photo": "https://res.cloudinary.com/dfbcj6o7j/image/upload/v1718793600/user_photos/abc123def456.jpg",
    "photo_updated_at": "2025-06-19T10:30:00.000Z",
    // ... other fields
  }
}
```

### **3. Update User Photo**

```
PUT /api/users/{id}/photo
Content-Type: multipart/form-data
Authorization: Bearer {token}

Fields:
- face_photo: File (required)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "full_name": "John Doe",
    "email": "john@example.com",
    "photo": "https://res.cloudinary.com/dfbcj6o7j/image/upload/v1718793600/user_photos/new123def456.jpg",
    "photo_updated_at": "2025-06-19T11:45:00.000Z"
  },
  "message": "Foto berhasil diupdate"
}
```

### **4. Get Current User**

```
GET /api/auth/me
Authorization: Bearer {token}

Response includes photo URL in same format as login
```

## 🎨 **Image Processing (Automatic)**

Backend akan otomatis memproses gambar dengan spesifikasi:

- **Resize**: 300x300 pixels
- **Crop**: Fill dengan face detection
- **Quality**: Auto optimization
- **Format**: Tetap sesuai original (JPEG/PNG/WebP)

## ❌ **Error Handling**

### **Common Errors:**

```json
// File tidak ditemukan
{
  "success": false,
  "code": "E_UPLOAD",
  "message": "Upload gambar wajah gagal atau tidak ditemukan. Pastikan field name adalah \"face_photo\""
}

// File terlalu besar (>20MB)
{
  "success": false,
  "code": "E_UPLOAD",
  "message": "File terlalu besar. Maksimal 20MB"
}

// Format tidak didukung
{
  "success": false,
  "code": "E_UPLOAD",
  "message": "Format file tidak didukung. Gunakan JPEG, PNG, atau WebP"
}

// Field name salah
{
  "success": false,
  "code": "E_UPLOAD",
  "message": "Field name untuk upload foto harus \"face_photo\""
}

// Cloudinary upload gagal
{
  "success": false,
  "code": "E_UPLOAD",
  "message": "Gagal mengupload foto ke cloud storage"
}
```

## 🔗 **URL Format**

**Cloudinary URL Structure:**

```
https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}

Example:
https://res.cloudinary.com/dfbcj6o7j/image/upload/v1718793600/user_photos/abc123def456.jpg
```

## 📱 **Frontend Implementation Tips**

### **1. Image Preview Before Upload:**

```javascript
function previewImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('preview').src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}
```

### **2. File Size Validation:**

```javascript
function validateFile(file) {
  const maxSize = 20 * 1024 * 1024; // 20MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    alert('File terlalu besar! Maksimal 20MB');
    return false;
  }

  if (!allowedTypes.includes(file.type)) {
    alert('Format tidak didukung! Gunakan JPEG, PNG, atau WebP');
    return false;
  }

  return true;
}
```

### **3. Upload Progress:**

```javascript
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', function (e) {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    console.log(percentComplete + '% uploaded');
  }
});
```

## 🔧 **Migration Status**

- ✅ **Backend**: Sudah menggunakan Cloudinary
- ✅ **Database**: Siap untuk migrasi (kolom `photo_url` dan `public_id`)
- ✅ **API**: Sudah mengembalikan Cloudinary URLs
- ⚠️ **Database Migration**: Belum dijalankan (masih menggunakan `file_path`)

## 📋 **Next Steps untuk Frontend**

1. **Update form upload** untuk menggunakan field name `face_photo`
2. **Update maksimal file size** dari 100MB ke 20MB
3. **Update URL handling** untuk menerima full Cloudinary URLs
4. **Test upload functionality** dengan endpoint yang sudah ada
5. **Update image display** untuk menggunakan Cloudinary URLs

## 🚀 **Server Status**

- **Server URL**: `http://localhost:3005`
- **API Docs**: `http://localhost:3005/docs`
- **Status**: ✅ Running dengan konfigurasi Cloudinary aktif
