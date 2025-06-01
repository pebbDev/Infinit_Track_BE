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

## 🛠️ Development

The project uses:

- **ESM modules** (`import/export`)
- **Sequelize** for database operations
- **JWT** for authentication
- **Winston** for logging
- **Express** web framework

## 📄 License

MIT
