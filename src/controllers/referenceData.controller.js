import { Role, Program, Position, Division } from '../models/index.js';

// GET /api/reference-data/roles - Get all roles for dropdown
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id_roles', 'role_name'],
      order: [['role_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: roles,
      message: 'Roles retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reference-data/programs - Get all programs for dropdown
export const getPrograms = async (req, res, next) => {
  try {
    const programs = await Program.findAll({
      attributes: ['id_programs', 'program_name'],
      order: [['program_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: programs,
      message: 'Programs retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reference-data/positions - Get all positions for dropdown (with optional program filter)
export const getPositions = async (req, res, next) => {
  try {
    const { program_id } = req.query;
    
    const whereClause = {};
    if (program_id) {
      whereClause.id_programs = program_id;
    }

    const positions = await Position.findAll({
      where: whereClause,
      attributes: ['id_positions', 'position_name', 'id_programs'],
      include: [
        {
          model: Program,
          attributes: ['program_name'],
          as: 'program'
        }
      ],
      order: [['position_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: positions,
      message: 'Positions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reference-data/divisions - Get all divisions for dropdown
export const getDivisions = async (req, res, next) => {
  try {
    const divisions = await Division.findAll({
      attributes: ['id_divisions', 'division_name'],
      order: [['division_name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: divisions,
      message: 'Divisions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};
