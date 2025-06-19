import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Settings = sequelize.define(
  'Settings',
  {
    setting_key: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      allowNull: false
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: 'settings',
    timestamps: false // karena menggunakan updated_at custom
  }
);

export default Settings;
