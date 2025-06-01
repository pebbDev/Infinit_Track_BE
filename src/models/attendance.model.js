import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Attendance = sequelize.define(
  'Attendance',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    clockIn: {
      type: DataTypes.DATE,
      allowNull: true
    },
    clockOut: {
      type: DataTypes.DATE,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    tableName: 'attendances',
    timestamps: true
  }
);

export default Attendance;
