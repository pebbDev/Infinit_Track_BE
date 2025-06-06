import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const AttendanceStatus = sequelize.define(
  'AttendanceStatus',
  {
    id_attendance_status: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    attendance_status_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  },
  {
    tableName: 'attendance_statuses',
    timestamps: false
  }
);

export default AttendanceStatus;
