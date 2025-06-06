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
import Settings from './settings.model.js';
import Booking from './booking.model.js';
import BookingStatus from './bookingStatus.model.js';

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

// Attendance relations
Attendance.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id_users',
  as: 'user'
});
Attendance.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location'
});
Attendance.belongsTo(AttendanceCategory, {
  foreignKey: 'category_id',
  targetKey: 'id_attendance_categories',
  as: 'attendance_category'
});
Attendance.belongsTo(Booking, {
  foreignKey: 'booking_id',
  as: 'booking'
});

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

// Booking relations
Booking.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id_users',
  as: 'user'
});
Booking.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location'
});
Booking.belongsTo(BookingStatus, {
  foreignKey: 'status',
  as: 'booking_status'
});

// BookingStatus relations
BookingStatus.hasMany(Booking, {
  foreignKey: 'status',
  as: 'bookings'
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
  Location,
  Settings,
  Booking,
  BookingStatus
};
