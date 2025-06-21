import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'changeme',
    ttl: 24 * 60 * 60 // 24 jam (24 * 60 * 60 detik)
  },
  db: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql'
  }
};
