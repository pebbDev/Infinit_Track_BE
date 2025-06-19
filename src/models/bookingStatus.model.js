import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const BookingStatus = sequelize.define(
  'BookingStatus',
  {
    id_booking_status: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name_status: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  },
  {
    tableName: 'booking_status',
    timestamps: false
  }
);

export default BookingStatus;
