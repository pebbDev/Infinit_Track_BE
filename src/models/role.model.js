import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Role = sequelize.define(
  'Role',
  {
    id_roles: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    role_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    }
  },
  {
    tableName: 'roles',
    timestamps: false
  }
);

export default Role;
