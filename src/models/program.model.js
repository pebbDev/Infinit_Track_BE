import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Program = sequelize.define(
  'Program',
  {
    id_programs: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    program_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  },
  {
    tableName: 'programs',
    timestamps: false
  }
);

export default Program;
