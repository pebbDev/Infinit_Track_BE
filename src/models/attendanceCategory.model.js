import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const AttendanceCategory = sequelize.define(
  'AttendanceCategory',
  {
    id_attendance_categories: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  },
  {
    tableName: 'attendance_categories',
    timestamps: false
  }
);

export default AttendanceCategory;
