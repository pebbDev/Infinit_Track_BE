import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Booking = sequelize.define(
  'Booking',
  {
    booking_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id_users'
      }
    },
    schedule_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'location_id'
      }
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'booking_status',
        key: 'id_booking_status'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id_users'
      }
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'bookings',
    timestamps: false // karena menggunakan created_at custom
  }
);

export default Booking;
