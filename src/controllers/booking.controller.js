import sequelize from '../config/database.js';
import { Booking, Location, BookingStatus, User, Position } from '../models/index.js';

// BAGIAN 1: Endpoint Membuat Booking (POST /api/bookings)
export const createBooking = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { schedule_date, latitude, longitude, radius = 100, description, notes = '' } = req.body;

    // Validasi format tanggal dan konversi
    const [day, month, year] = schedule_date.split('-');
    const scheduleDate = new Date(`${year}-${month}-${day}`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Set waktu ke awal hari untuk perbandingan yang akurat
    scheduleDate.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);

    // Validasi: tanggal harus besok atau setelahnya
    if (scheduleDate < tomorrow) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tanggal booking harus hari esok atau setelahnya.'
      });
    }

    // Cek apakah user sudah memiliki booking pending
    const existingPendingBooking = await Booking.findOne({
      where: {
        user_id: userId,
        status: 3 // pending status
      },
      transaction
    });

    if (existingPendingBooking) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memiliki pengajuan booking yang aktif.'
      });
    }

    // Proses Database:
    // 1. Buat entri baru di tabel locations
    const newLocation = await Location.create(
      {
        user_id: userId,
        id_attendance_categories: 3, // WFA category
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
        description: description || 'WFA Location'
      },
      { transaction }
    );

    // 2. Buat entri baru di tabel bookings
    const newBooking = await Booking.create(
      {
        user_id: userId,
        schedule_date: scheduleDate.toISOString().split('T')[0], // YYYY-MM-DD format
        location_id: newLocation.location_id,
        notes: notes,
        status: 3, // pending
        created_at: new Date()
      },
      { transaction }
    );

    await transaction.commit();

    // Respons Sukses
    res.status(201).json({
      success: true,
      message: 'Booking WFA berhasil diajukan dan menunggu persetujuan.',
      data: {
        booking_id: newBooking.booking_id,
        schedule_date: newBooking.schedule_date,
        location_id: newBooking.location_id,
        status: 'pending'
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// BAGIAN 2: Endpoint Menyetujui Booking (PATCH /api/bookings/{id})
export const updateBookingStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status } = req.body;
    const approvedBy = req.user.id;

    // Validasi: cari booking
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email']
        },
        {
          model: Location,
          as: 'location'
        }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Booking tidak ditemukan.'
      });
    }

    // Validasi: pastikan schedule_date belum lewat
    const scheduleDate = new Date(booking.schedule_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduleDate < today) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat memproses booking yang sudah lewat tanggalnya.'
      });
    }

    // Validasi: pastikan status valid
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Status harus "approved" atau "rejected".'
      });
    }

    // Konversi status text ke ID
    const statusId = status === 'approved' ? 1 : 2;

    // Update record booking
    await booking.update(
      {
        status: statusId,
        approved_by: approvedBy,
        processed_at: new Date()
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch updated booking dengan relasi untuk response
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email']
        },
        {
          model: Location,
          as: 'location'
        },
        {
          model: BookingStatus,
          as: 'booking_status',
          attributes: ['name_status']
        }
      ]
    });

    // Respons Sukses
    res.status(200).json({
      success: true,
      message: `Booking berhasil di-${status}.`,
      data: {
        booking_id: updatedBooking.booking_id,
        user: {
          full_name: updatedBooking.user.full_name,
          email: updatedBooking.user.email
        },
        schedule_date: updatedBooking.schedule_date,
        status: updatedBooking.booking_status.name_status,
        location: {
          latitude: updatedBooking.location.latitude,
          longitude: updatedBooking.location.longitude,
          radius: updatedBooking.location.radius,
          description: updatedBooking.location.description
        },
        processed_at: updatedBooking.processed_at
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Endpoint tambahan: Mendapatkan daftar booking (untuk admin)
export const getAllBookings = async (req, res, next) => {
  try {
    // Dapatkan Parameter Query
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Buat objek whereClause untuk Sequelize
    const whereClause = {};
    if (status) {
      const statusMap = {
        approved: 1,
        rejected: 2,
        pending: 3
      };
      whereClause.status = statusMap[status];
    }

    // Lakukan Query ke Database dengan include yang lengkap
    const bookings = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id_users', 'full_name', 'email', 'nip_nim'],
          include: [
            {
              model: Position,
              as: 'position',
              attributes: ['position_name']
            }
          ]
        },
        {
          model: Location,
          as: 'location',
          attributes: ['location_id', 'latitude', 'longitude', 'radius', 'description']
        },
        {
          model: BookingStatus,
          as: 'booking_status',
          attributes: ['name_status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true // Important for correct count with includes
    }); // Transform data dengan struktur location yang grouped
    const transformedBookings = bookings.rows.map((booking) => ({
      booking_id: booking.booking_id,
      user_id: booking.user.id_users,
      user_full_name: booking.user.full_name,
      user_email: booking.user.email,
      user_nip_nim: booking.user.nip_nim,
      user_position_name: booking.user.position ? booking.user.position.position_name : null,
      schedule_date: booking.schedule_date,
      status: booking.booking_status.name_status,
      location: {
        location_id: booking.location.location_id,
        latitude: parseFloat(booking.location.latitude),
        longitude: parseFloat(booking.location.longitude),
        radius: parseFloat(booking.location.radius),
        description: booking.location.description
      },
      notes: booking.notes,
      created_at: booking.created_at,
      processed_at: booking.processed_at,
      approved_by: booking.approved_by
    }));

    // Response dengan struktur data yang flattened
    res.status(200).json({
      success: true,
      data: {
        bookings: transformedBookings,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(bookings.count / limit),
          total_items: bookings.count,
          items_per_page: parseInt(limit)
        }
      },
      message: 'Daftar booking berhasil diambil'
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint tambahan: Mendapatkan booking user sendiri
export const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const bookings = await Booking.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Location,
          as: 'location'
        },
        {
          model: BookingStatus,
          as: 'booking_status',
          attributes: ['name_status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: {
        bookings: bookings.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(bookings.count / limit),
          total_items: bookings.count,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
