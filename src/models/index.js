// Models index file - Sequelize models entry point
import sequelize from '../config/database.js';

import User from './user.model.js';
import Attendance from './attendance.model.js';
import WfaRequest from './wfaRequest.model.js';
import Program from './program.model.js';
import Role from './role.model.js';
import Position from './position.model.js';
import Division from './division.model.js';
import Photo from './photo.model.js';
import AttendanceCategory from './attendanceCategory.model.js';

// Jalankan relasi SETELAH define semua model
User.belongsTo(Role, { foreignKey: 'id_roles', as: 'role' });
User.belongsTo(Program, { foreignKey: 'id_programs', as: 'program' });
User.belongsTo(Position, { foreignKey: 'id_position', as: 'position' });
User.belongsTo(Division, { foreignKey: 'id_divisions', as: 'division' });
User.belongsTo(Photo, { foreignKey: 'id_photos', as: 'photo_file' });

// Role relations
Role.hasMany(User, { foreignKey: 'id_roles', as: 'users' });

// Program relations
Program.hasMany(User, { foreignKey: 'id_programs', as: 'users' });
Program.hasMany(Position, { foreignKey: 'id_programs', as: 'positions' });

// Position relations
Position.belongsTo(Program, { foreignKey: 'id_programs', as: 'program' });
Position.hasMany(User, { foreignKey: 'id_position', as: 'users' });

// Division relations
Division.hasMany(User, { foreignKey: 'id_divisions', as: 'users' });

// Photo relations
Photo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  sequelize,
  User,
  Attendance,
  WfaRequest,
  Program,
  Role,
  Position,
  Division,
  Photo,
  AttendanceCategory
};
