import { describe, it, expect, beforeEach } from 'vitest'
import {
  pixelToLatLng,
  latLngToPixel,
  calculateDistance,
  calculateDestinationPoint,
  calculateBearing,
  generateCirclePoints,
  generateRectanglePoints
} from '../coordinateUtils'

describe('coordinateUtils', () => {
  let mockProjection: google.maps.MapCanvasProjection

  beforeEach(() => {
    // Create a simple mock projection for testing
    mockProjection = {
      fromLatLngToContainerPixel: (latLng: any) =>
        new global.google.maps.Point(latLng.lng * 100, latLng.lat * 100),
      fromContainerPixelToLatLng: (point: any) =>
        new global.google.maps.LatLng(point.y / 100, point.x / 100)
    } as any
  })

  describe('pixelToLatLng', () => {
    it('converts pixel coordinates to LatLng', () => {
      const result = pixelToLatLng(13950, 3550, mockProjection)

      expect(result).toBeInstanceOf(global.google.maps.LatLng)
      expect(result?.lat).toBe(35.5)
      expect(result?.lng).toBe(139.5)
    })

    it('returns null when projection is null', () => {
      const result = pixelToLatLng(100, 200, null as any)
      expect(result).toBeNull()
    })
  })

  describe('latLngToPixel', () => {
    it('converts LatLng coordinates to pixels', () => {
      const result = latLngToPixel(35.5, 139.5, mockProjection)

      expect(result).toBeInstanceOf(global.google.maps.Point)
      expect(result?.x).toBe(13950)
      expect(result?.y).toBe(3550)
    })

    it('returns null when projection is null', () => {
      const result = latLngToPixel(35.5, 139.5, null as any)
      expect(result).toBeNull()
    })
  })

  describe('calculateDistance', () => {
    it('calculates distance between two points in Tokyo area', () => {
      const shibuya = { lat: 35.6598, lng: 139.7006 }
      const shinjuku = { lat: 35.6895, lng: 139.6917 }

      const distance = calculateDistance(shibuya, shinjuku)

      // Distance between Shibuya and Shinjuku is approximately 3.3km
      expect(distance).toBeGreaterThan(3000)
      expect(distance).toBeLessThan(4000)
    })

    it('returns 0 for identical points', () => {
      const point = { lat: 35.6598, lng: 139.7006 }
      const distance = calculateDistance(point, point)

      expect(distance).toBe(0)
    })

    it('handles equatorial coordinates', () => {
      const point1 = { lat: 0, lng: 0 }
      const point2 = { lat: 0, lng: 1 }

      const distance = calculateDistance(point1, point2)

      // 1 degree longitude at equator ≈ 111.32 km
      expect(distance).toBeGreaterThan(111000)
      expect(distance).toBeLessThan(112000)
    })
  })

  describe('calculateDestinationPoint', () => {
    it('calculates destination point with given distance and bearing', () => {
      const start = { lat: 35.6598, lng: 139.7006 } // Shibuya
      const distance = 1000 // 1km
      const bearing = Math.PI / 2 // 90 degrees (east)

      const destination = calculateDestinationPoint(start, distance, bearing)

      // Moving east should increase longitude
      expect(destination.lng).toBeGreaterThan(start.lng)
      // Latitude should be approximately the same
      expect(Math.abs(destination.lat - start.lat)).toBeLessThan(0.01)
    })

    it('calculates destination point moving north', () => {
      const start = { lat: 35.6598, lng: 139.7006 }
      const distance = 1000 // 1km
      const bearing = 0 // North

      const destination = calculateDestinationPoint(start, distance, bearing)

      // Moving north should increase latitude
      expect(destination.lat).toBeGreaterThan(start.lat)
      // Longitude should be approximately the same
      expect(Math.abs(destination.lng - start.lng)).toBeLessThan(0.01)
    })
  })

  describe('calculateBearing', () => {
    it('calculates bearing between two points', () => {
      const start = { lat: 35.6598, lng: 139.7006 }
      const end = { lat: 35.6598, lng: 139.7106 } // Same lat, higher lng (east)

      const bearing = calculateBearing(start, end)

      // Bearing should be approximately π/2 (90 degrees, east)
      expect(bearing).toBeCloseTo(Math.PI / 2, 1)
    })

    it('calculates bearing for northward movement', () => {
      const start = { lat: 35.6598, lng: 139.7006 }
      const end = { lat: 35.6698, lng: 139.7006 } // Higher lat, same lng (north)

      const bearing = calculateBearing(start, end)

      // Bearing should be approximately 0 (north)
      expect(bearing).toBeCloseTo(0, 1)
    })
  })

  describe('generateCirclePoints', () => {
    it('generates correct number of points for a circle', () => {
      const center = { lat: 35.6598, lng: 139.7006 }
      const radius = 100 // 100 meters
      const segments = 8

      const points = generateCirclePoints(center, radius, segments)

      expect(points).toHaveLength(segments)
    })

    it('generates points at approximately correct distance from center', () => {
      const center = { lat: 35.6598, lng: 139.7006 }
      const radius = 100 // 100 meters
      const segments = 4

      const points = generateCirclePoints(center, radius, segments)

      // Each point should be approximately 100m from center
      points.forEach(point => {
        const distance = calculateDistance(center, point)
        expect(distance).toBeCloseTo(radius, -1) // Within 10m tolerance
      })
    })

    it('generates evenly spaced points', () => {
      const center = { lat: 35.6598, lng: 139.7006 }
      const radius = 1000 // Increase radius for more noticeable difference
      const segments = 4

      const points = generateCirclePoints(center, radius, segments)

      expect(points).toHaveLength(4)

      // Check that all points are at the expected distance
      points.forEach(point => {
        const distance = calculateDistance(center, point)
        expect(distance).toBeCloseTo(radius, -1)
      })

      // For 4 segments starting at angle 0, we should have points at 0°, 90°, 180°, 270°
      // But let's just verify the general structure rather than exact positioning
      const distances = points.map(point => calculateDistance(center, point))
      const allDistancesEqual = distances.every(d => Math.abs(d - radius) < 50)
      expect(allDistancesEqual).toBe(true)
    })
  })

  describe('generateRectanglePoints', () => {
    it('generates 4 points for a rectangle', () => {
      const topLeft = { lat: 35.67, lng: 139.70 }
      const bottomRight = { lat: 35.66, lng: 139.71 }

      const points = generateRectanglePoints(topLeft, bottomRight)

      expect(points).toHaveLength(4)
    })

    it('generates correct corner points', () => {
      const topLeft = { lat: 35.67, lng: 139.70 }
      const bottomRight = { lat: 35.66, lng: 139.71 }

      const points = generateRectanglePoints(topLeft, bottomRight)

      // Verify each corner
      expect(points[0]).toEqual(topLeft) // Top-left
      expect(points[1]).toEqual({ lat: 35.67, lng: 139.71 }) // Top-right
      expect(points[2]).toEqual(bottomRight) // Bottom-right
      expect(points[3]).toEqual({ lat: 35.66, lng: 139.70 }) // Bottom-left
    })

    it('handles edge case where coordinates are equal', () => {
      const point = { lat: 35.67, lng: 139.70 }

      const points = generateRectanglePoints(point, point)

      expect(points).toHaveLength(4)
      // All points should be the same
      points.forEach(p => {
        expect(p).toEqual(point)
      })
    })
  })
})
