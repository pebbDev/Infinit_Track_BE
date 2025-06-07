/**
 * Utility functions for handling search functionality across controllers
 */

import { Op } from 'sequelize';

/**
 * Apply search functionality to Sequelize query options
 * @param {Object} queryOptions - Sequelize query options object to modify
 * @param {string} searchTerm - Search term to look for
 * @param {Array<string>} searchFields - Array of field paths to search in (e.g., ['$user.full_name$', '$user.nip_nim$'])
 * @returns {Object} Modified queryOptions with search conditions
 */
export const applySearch = (queryOptions, searchTerm, searchFields) => {
  // If no search term provided, return unchanged query options
  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
    return queryOptions;
  }

  // If no search fields provided, return unchanged query options
  if (!searchFields || !Array.isArray(searchFields) || searchFields.length === 0) {
    return queryOptions;
  }

  // Initialize where clause if it doesn't exist
  if (!queryOptions.where) {
    queryOptions.where = {};
  }

  // Build search conditions using OR operator
  const searchConditions = searchFields.map((field) => ({
    [field]: {
      [Op.like]: `%${searchTerm.trim()}%`
    }
  }));

  // Add search conditions to existing where clause
  if (queryOptions.where[Op.and]) {
    // If there's already an AND condition, add search as another AND condition
    queryOptions.where[Op.and].push({
      [Op.or]: searchConditions
    });
  } else if (Object.keys(queryOptions.where).length > 0) {
    // If there are existing where conditions, wrap them in AND with search
    const existingConditions = { ...queryOptions.where };
    queryOptions.where = {
      [Op.and]: [
        existingConditions,
        {
          [Op.or]: searchConditions
        }
      ]
    };
  } else {
    // If no existing where conditions, just add search
    queryOptions.where = {
      [Op.or]: searchConditions
    };
  }

  return queryOptions;
};

/**
 * Apply multiple search terms to query options
 * @param {Object} queryOptions - Sequelize query options object to modify
 * @param {Object} searchParams - Object containing search terms for different fields
 * @param {Object} searchFieldMappings - Mapping of search param keys to database field paths
 * @returns {Object} Modified queryOptions with search conditions
 */
export const applyMultipleSearch = (queryOptions, searchParams, searchFieldMappings) => {
  if (!searchParams || typeof searchParams !== 'object') {
    return queryOptions;
  }

  if (!searchFieldMappings || typeof searchFieldMappings !== 'object') {
    return queryOptions;
  }

  // Apply each search parameter
  Object.keys(searchParams).forEach((paramKey) => {
    const searchTerm = searchParams[paramKey];
    const searchFields = searchFieldMappings[paramKey];

    if (searchTerm && searchFields) {
      applySearch(queryOptions, searchTerm, searchFields);
    }
  });

  return queryOptions;
};

export default {
  applySearch,
  applyMultipleSearch
};
