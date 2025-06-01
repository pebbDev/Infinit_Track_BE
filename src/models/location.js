import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Location = sequelize.define(
  'Location',
  {
    location_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id_users'
      }
    },
    id_attendance_categories: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'attendance_categories',
        key: 'id_attendance_categories'
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false
    },
    radius: {
      type: DataTypes.FLOAT(5, 2),
      allowNull: false,
      defaultValue: 100
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
  {
    tableName: 'locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

Location.associate = (models) => {
  Location.belongsTo(models.User, {
    foreignKey: 'user_id',
    targetKey: 'id_users'
  });

  Location.belongsTo(models.AttendanceCategory, {
    foreignKey: 'id_attendance_categories',
    targetKey: 'id_attendance_categories'
  });
};

export default Location;
