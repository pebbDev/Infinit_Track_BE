# Infinite Track Backend

Express.js MVC application for employee attendance tracking with Sequelize ORM.

## 🚀 Features

- **Authentication:** JWT with sliding TTL
- **Database:** MySQL with Sequelize ORM
- **Architecture:** MVC pattern
- **Documentation:** Swagger API docs at `/docs`
- **Logging:** Winston with daily rotation
- **Development:** Hot reload with nodemon
- **Code Quality:** ESLint + Prettier

## 📦 Installation

```bash
npm install
cp .env.example .env
# Edit .env with your database credentials
```

## 🔧 Scripts

```bash
npm run dev          # Start development server
npm start            # Start production server
npm run lint         # Run ESLint
npm run migrate      # Run database migrations
npm run seed         # Run database seeders
npm test             # Run tests
```

## 📁 Project Structure

```
src/
├── app.js           # Express app configuration
├── server.js        # Server entry point
├── config/          # Configuration files
├── models/          # Sequelize models & migrations
├── controllers/     # Route controllers
├── routes/          # API routes
├── middlewares/     # Custom middlewares
└── utils/           # Utility functions
```

## 🗄️ Database

Make sure MySQL is running and update `.env` with your database credentials.

```bash
npm run migrate      # Create tables
npm run seed         # Seed initial data
```

## 📖 API Documentation

Visit `/docs` endpoint when server is running to view Swagger documentation.

### Key Endpoints

#### Attendance

- `GET /api/attendance/status-today` - Get today's attendance status (source of truth for mobile UI)
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/history` - Get attendance history

#### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### Mobile Integration

For Android integration, see:

- `API_DOCUMENTATION_ATTENDANCE_STATUS.md` - Complete API documentation
- `ANDROID_INTEGRATION_GUIDE.md` - Quick integration guide for Android developers

## 🛠️ Development

The project uses:

- **ESM modules** (`import/export`)
- **Sequelize** for database operations
- **JWT** for authentication
- **Winston** for logging
- **Express** web framework

## 📄 License

MIT
