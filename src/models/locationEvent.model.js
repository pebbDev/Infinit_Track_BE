import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const LocationEvent = sequelize.define(
  'LocationEvent',
  {
    id: {
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
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'location_id'
      }
    },
    event_type: {
      type: DataTypes.ENUM('ENTER', 'EXIT'),
      allowNull: false
    },
    event_timestamp: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: 'location_events',
    timestamps: false // Since the table doesn't have created_at/updated_at columns
  }
);

export default LocationEvent;
