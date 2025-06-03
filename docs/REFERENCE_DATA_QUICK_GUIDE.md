# Quick Reference - Reference Data Endpoints

## Endpoint Summary

| Endpoint         | Method | Auth Required | Role Required    | Description                               |
| ---------------- | ------ | ------------- | ---------------- | ----------------------------------------- |
| `/api/roles`     | GET    | Yes           | Admin/Management | Get all roles                             |
| `/api/programs`  | GET    | Yes           | Admin/Management | Get all programs                          |
| `/api/positions` | GET    | Yes           | Admin/Management | Get all positions (filterable by program) |
| `/api/divisions` | GET    | Yes           | Admin/Management | Get all divisions                         |

## Authentication

```
Authorization: Bearer <jwt_token>
```

## Response Format

```json
{
  "success": true,
  "data": [{ "id": 1, "name": "Item Name" }],
  "message": "Data fetched successfully"
}
```

## Quick Usage Examples

### JavaScript Fetch

```javascript
const token = localStorage.getItem('token');

// Get roles
const roles = await fetch('/api/roles', {
  headers: { Authorization: `Bearer ${token}` }
}).then((res) => res.json());

// Get programs
const programs = await fetch('/api/programs', {
  headers: { Authorization: `Bearer ${token}` }
}).then((res) => res.json());

// Get all positions
const positions = await fetch('/api/positions', {
  headers: { Authorization: `Bearer ${token}` }
}).then((res) => res.json());

// Get positions for specific program
const filteredPositions = await fetch('/api/positions?program_id=1', {
  headers: { Authorization: `Bearer ${token}` }
}).then((res) => res.json());

// Get divisions
const divisions = await fetch('/api/divisions', {
  headers: { Authorization: `Bearer ${token}` }
}).then((res) => res.json());
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useReferenceData(token) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [roles, programs, positions, divisions] = await Promise.all([
          fetch('/api/roles', { headers }).then((r) => r.json()),
          fetch('/api/programs', { headers }).then((r) => r.json()),
          fetch('/api/positions', { headers }).then((r) => r.json()),
          fetch('/api/divisions', { headers }).then((r) => r.json())
        ]);

        setData({
          roles: roles.data,
          programs: programs.data,
          positions: positions.data,
          divisions: divisions.data
        });
      } catch (error) {
        console.error('Error fetching reference data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchData();
  }, [token]);

  return { data, loading };
}
```

## Postman Collection

Import this JSON to test the endpoints:

```json
{
  "info": {
    "name": "Reference Data API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3005/api"
    },
    {
      "key": "token",
      "value": "your_jwt_token_here"
    }
  ],
  "item": [
    {
      "name": "Get Roles",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/roles"
      }
    },
    {
      "name": "Get Programs",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/programs"
      }
    },
    {
      "name": "Get Positions",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/positions"
      }
    },
    {
      "name": "Get Positions by Program",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/positions?program_id=1",
          "host": ["{{baseUrl}}"],
          "path": ["positions"],
          "query": [
            {
              "key": "program_id",
              "value": "1"
            }
          ]
        }
      }
    },
    {
      "name": "Get Divisions",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": "{{baseUrl}}/divisions"
      }
    }
  ]
}
```
