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
import Location from './location.js';

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

// Location relations with User and AttendanceCategory
User.hasOne(Location, {
  foreignKey: 'user_id',
  as: 'wfh_location',
  scope: { id_attendance_categories: 2 }
});
Location.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id_users',
  as: 'user'
});
Location.belongsTo(AttendanceCategory, {
  foreignKey: 'id_attendance_categories',
  as: 'attendance_category'
});

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
  AttendanceCategory,
  Location
};
