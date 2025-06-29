import type { Point } from '../types'

/**
 * Earth's radius in meters (used for geographic calculations)
 */
const EARTH_RADIUS_M = 6371000

/**
 * Convert pixel coordinates to geographic coordinates using Google Maps projection
 */
export const pixelToLatLng = (
  x: number,
  y: number,
  projection: google.maps.MapCanvasProjection
): google.maps.LatLng | null => {
  if (!projection) return null

  const point = new google.maps.Point(x, y)
  return projection.fromContainerPixelToLatLng(point)
}

/**
 * Convert geographic coordinates to pixel coordinates using Google Maps projection
 */
export const latLngToPixel = (
  lat: number,
  lng: number,
  projection: google.maps.MapCanvasProjection
): google.maps.Point | null => {
  if (!projection) return null

  const latLng = new google.maps.LatLng(lat, lng)
  return projection.fromLatLngToContainerPixel(latLng)
}

/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param from Starting point
 * @param to Ending point
 * @returns Distance in meters
 */
export const calculateDistance = (from: Point, to: Point): number => {
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat * Math.PI / 180
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_M * c
}

/**
 * Calculate a destination point given a starting point, distance, and bearing
 * @param from Starting point
 * @param distance Distance in meters
 * @param bearing Bearing in radians
 * @returns Destination point
 */
export const calculateDestinationPoint = (from: Point, distance: number, bearing: number): Point => {
  const lat1 = from.lat * Math.PI / 180
  const lng1 = from.lng * Math.PI / 180
  const angularDistance = distance / EARTH_RADIUS_M

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  )

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  )

  return {
    lat: lat2 * 180 / Math.PI,
    lng: lng2 * 180 / Math.PI
  }
}

/**
 * Calculate bearing between two geographic points
 * @param from Starting point
 * @param to Ending point
 * @returns Bearing in radians
 */
export const calculateBearing = (from: Point, to: Point): number => {
  const dLng = to.lng - from.lng
  const y = Math.sin(dLng * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180)
  const x = Math.cos(from.lat * Math.PI / 180) * Math.sin(to.lat * Math.PI / 180) -
            Math.sin(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.cos(dLng * Math.PI / 180)
  return Math.atan2(y, x)
}

/**
 * Generate points for a circle as a polygon
 * @param center Center point of the circle
 * @param radius Radius in meters
 * @param segments Number of segments to approximate the circle
 * @returns Array of points forming a polygon
 */
export const generateCirclePoints = (center: Point, radius: number, segments: number): Point[] => {
  const points: Point[] = []

  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments
    const point = calculateDestinationPoint(center, radius, angle)
    points.push(point)
  }

  return points
}

/**
 * Generate points for a rectangle
 * @param topLeft Top-left corner
 * @param bottomRight Bottom-right corner
 * @returns Array of 4 points forming a rectangle
 */
export const generateRectanglePoints = (topLeft: Point, bottomRight: Point): Point[] => {
  return [
    topLeft,
    { lat: topLeft.lat, lng: bottomRight.lng }, // Top-right
    bottomRight,
    { lat: bottomRight.lat, lng: topLeft.lng }, // Bottom-left
  ]
}
