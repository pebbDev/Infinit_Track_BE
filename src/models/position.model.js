import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const Position = sequelize.define(
  'Position',
  {
    id_positions: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_programs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'programs',
        key: 'id_programs'
      }
    },
    position_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  },
  {
    tableName: 'positions',
    timestamps: false
  }
);

export default Position;
