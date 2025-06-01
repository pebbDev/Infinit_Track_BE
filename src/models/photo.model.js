import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Photo = sequelize.define(
  'Photo',
  {
    id_photos: {
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
    file_path: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    photo_updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: 'photos',
    timestamps: false
  }
);

export default Photo;
