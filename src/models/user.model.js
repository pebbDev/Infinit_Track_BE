import { DataTypes } from 'sequelize';

import sequelize from '../config/database.js';

const User = sequelize.define(
  'User',
  {
    id_users: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    id_roles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id_roles'
      }
    },
    id_programs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'programs',
        key: 'id_programs'
      }
    },
    id_position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'positions',
        key: 'id_positions'
      }
    },
    id_divisions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id_divisions'
      }
    },
    full_name: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    nip_nim: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    id_photos: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null temporarily during registration
      references: {
        model: 'photos',
        key: 'id_photos'
      }
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default User;
