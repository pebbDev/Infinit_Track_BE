import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Division = sequelize.define(
  'Division',
  {
    id_divisions: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    division_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  },
  {
    tableName: 'divisions',
    timestamps: false
  }
);

Division.associate = (models) => {
  Division.hasMany(models.User, {
    foreignKey: 'id_divisions',
    as: 'users'
  });
};

export default Division;
