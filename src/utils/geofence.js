import { getDistance } from 'geolib';

/**
 * Calculate distance between two coordinates in meters
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  return getDistance({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 });
};

/**
 * Check if user is within allowed radius of a location
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} locationLat - Location's latitude
 * @param {number} locationLon - Location's longitude
 * @param {number} radius - Allowed radius in meters
 * @returns {boolean} True if within radius
 */
export const isWithinRadius = (userLat, userLon, locationLat, locationLon, radius) => {
  const distance = calculateDistance(userLat, userLon, locationLat, locationLon);
  return distance <= radius;
};
