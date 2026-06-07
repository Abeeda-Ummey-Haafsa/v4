/**
 * Calculate distance between two geographic points using Haversine formula
 * @param lat1 - Latitude of first point in degrees
 * @param lng1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lng2 - Longitude of second point in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Earth's radius in kilometers
  const R = 6371;

  // Convert degrees to radians
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  // Haversine formula
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Round distance to specified decimal places
 * @param distance - Distance in kilometers
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded distance
 */
export function roundDistance(distance: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(distance * factor) / factor;
}

/**
 * Validate latitude and longitude coordinates
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lng - Longitude in degrees (-180 to 180)
 * @returns true if coordinates are valid
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;
}

/**
 * Calculate distance with validation
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers or null if coordinates are invalid
 */
export function calculateDistanceSafe(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number | null {
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    return null;
  }
  return calculateDistance(lat1, lng1, lat2, lng2);
}
