import { Role, Program, Position, Division } from '../models/index.js';
import logger from '../utils/logger.js';

// GET /api/roles - Get all roles for dropdown
export const getRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      order: [['role_name', 'ASC']]
    });

    const transformedRoles = roles.map((role) => ({
      id: role.id_roles,
      name: role.role_name
    }));

    logger.info(`Roles fetched successfully, returned ${transformedRoles.length} roles`);

    res.json({
      success: true,
      data: transformedRoles,
      message: 'Roles fetched successfully'
    });
  } catch (error) {
    logger.error(`Error fetching roles: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// GET /api/programs - Get all programs for dropdown
export const getPrograms = async (req, res, next) => {
  try {
    const programs = await Program.findAll({
      order: [['program_name', 'ASC']]
    });

    const transformedPrograms = programs.map((program) => ({
      id: program.id_programs,
      name: program.program_name
    }));

    logger.info(`Programs fetched successfully, returned ${transformedPrograms.length} programs`);

    res.json({
      success: true,
      data: transformedPrograms,
      message: 'Programs fetched successfully'
    });
  } catch (error) {
    logger.error(`Error fetching programs: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// GET /api/positions - Get all positions for dropdown (with optional program filter)
export const getPositions = async (req, res, next) => {
  try {
    // Get program_id from query parameters
    const { program_id } = req.query;

    // Build where clause
    const whereClause = {};
    if (program_id) {
      whereClause.id_programs = program_id;
    }

    const positions = await Position.findAll({
      where: whereClause,
      order: [['position_name', 'ASC']]
    });

    const transformedPositions = positions.map((position) => ({
      id: position.id_positions,
      name: position.position_name
    }));

    logger.info(
      `Positions fetched successfully, returned ${transformedPositions.length} positions${program_id ? ` for program ${program_id}` : ''}`
    );

    res.json({
      success: true,
      data: transformedPositions,
      message: 'Positions fetched successfully'
    });
  } catch (error) {
    logger.error(`Error fetching positions: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// GET /api/divisions - Get all divisions for dropdown
export const getDivisions = async (req, res, next) => {
  try {
    const divisions = await Division.findAll({
      order: [['division_name', 'ASC']]
    });

    const transformedDivisions = divisions.map((division) => ({
      id: division.id_divisions,
      name: division.division_name
    }));

    logger.info(
      `Divisions fetched successfully, returned ${transformedDivisions.length} divisions`
    );

    res.json({
      success: true,
      data: transformedDivisions,
      message: 'Divisions fetched successfully'
    });
  } catch (error) {
    logger.error(`Error fetching divisions: ${error.message}`, { stack: error.stack });
    next(error);
  }
};
