import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const WfaRequest = sequelize.define(
  'WfaRequest',
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
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    }
  },
  {
    tableName: 'wfa_requests',
    timestamps: true
  }
);

export default WfaRequest;
