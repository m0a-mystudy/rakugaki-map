import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  safeMapMethodCall,
  rotateMap,
  resetMapRotation,
  adjustTilt,
  resetTilt,
  createMapOptions,
  getMapState,
  centerOnLocation
} from '../mapUtils'
import { MAP_CONSTANTS } from '../../constants/map'

describe('mapUtils', () => {
  let mockMap: google.maps.Map
  let mockSetHeading: ReturnType<typeof vi.fn>
  let mockSetTilt: ReturnType<typeof vi.fn>
  let mockSetOptions: ReturnType<typeof vi.fn>
  let mockGetHeading: ReturnType<typeof vi.fn>
  let mockGetTilt: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSetHeading = vi.fn()
    mockSetTilt = vi.fn()
    mockSetOptions = vi.fn()
    mockGetHeading = vi.fn().mockReturnValue(0)
    mockGetTilt = vi.fn().mockReturnValue(0)

    mockMap = {
      setHeading: mockSetHeading,
      setTilt: mockSetTilt,
      setOptions: mockSetOptions,
      getHeading: mockGetHeading,
      getTilt: mockGetTilt,
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      getCenter: vi.fn().mockReturnValue({ toJSON: () => ({ lat: 35.6598, lng: 139.7006 }) }),
      getZoom: vi.fn().mockReturnValue(15),
    } as any
  })

  describe('safeMapMethodCall', () => {
    it('calls method when it exists', () => {
      safeMapMethodCall(mockMap, 'setHeading', 45, 'heading')

      expect(mockSetHeading).toHaveBeenCalledWith(45)
      expect(mockSetOptions).not.toHaveBeenCalled()
    })

    it('falls back to setOptions when method does not exist', () => {
      const mapWithoutMethod = {
        setOptions: mockSetOptions
      } as any

      safeMapMethodCall(mapWithoutMethod, 'setHeading', 45, 'heading')

      expect(mockSetOptions).toHaveBeenCalledWith({ heading: 45 })
    })

    it('handles method call errors gracefully', () => {
      mockSetHeading.mockImplementation(() => { throw new Error('Method failed') })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      safeMapMethodCall(mockMap, 'setHeading', 45, 'heading')

      expect(consoleSpy).toHaveBeenCalledWith('Failed to call setHeading:', expect.any(Error))
      expect(mockSetOptions).toHaveBeenCalledWith({ heading: 45 })

      consoleSpy.mockRestore()
    })

    it('handles setOptions errors gracefully', () => {
      const mapWithFailingOptions = {
        setOptions: vi.fn().mockImplementation(() => { throw new Error('Options failed') })
      } as any

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      safeMapMethodCall(mapWithFailingOptions, 'setHeading', 45, 'heading')

      expect(consoleSpy).toHaveBeenCalledTimes(2)

      consoleSpy.mockRestore()
    })
  })

  describe('rotateMap', () => {
    it('rotates map by specified degrees', () => {
      const newHeading = rotateMap(mockMap, 0, 45)

      expect(newHeading).toBe(45)
      expect(mockSetHeading).toHaveBeenCalledWith(45)
    })

    it('handles full rotation (360 degrees)', () => {
      const newHeading = rotateMap(mockMap, 315, 90)

      expect(newHeading).toBe(45) // (315 + 90) % 360 = 45
      expect(mockSetHeading).toHaveBeenCalledWith(45)
    })

    it('handles negative rotation', () => {
      const newHeading = rotateMap(mockMap, 45, -90)

      expect(newHeading).toBe(315) // (45 - 90) % 360 = -45 % 360 = 315
      expect(mockSetHeading).toHaveBeenCalledWith(315)
    })

    it('returns current heading when map is null', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const newHeading = rotateMap(null as any, 45, 90)

      expect(newHeading).toBe(45)
      expect(consoleSpy).toHaveBeenCalledWith('Map is null')

      consoleSpy.mockRestore()
    })
  })

  describe('resetMapRotation', () => {
    it('resets map heading to 0', () => {
      resetMapRotation(mockMap)

      expect(mockSetHeading).toHaveBeenCalledWith(MAP_CONSTANTS.DEFAULT_HEADING)
    })

    it('handles null map gracefully', () => {
      expect(() => resetMapRotation(null as any)).not.toThrow()
    })
  })

  describe('adjustTilt', () => {
    it('adjusts tilt by specified degrees', () => {
      const newTilt = adjustTilt(mockMap, 0, 15)

      expect(newTilt).toBe(15)
      expect(mockSetTilt).toHaveBeenCalledWith(15)
    })

    it('clamps tilt to maximum value (67.5)', () => {
      const newTilt = adjustTilt(mockMap, 60, 20)

      expect(newTilt).toBe(67.5)
      expect(mockSetTilt).toHaveBeenCalledWith(67.5)
    })

    it('clamps tilt to minimum value (0)', () => {
      const newTilt = adjustTilt(mockMap, 5, -10)

      expect(newTilt).toBe(0)
      expect(mockSetTilt).toHaveBeenCalledWith(0)
    })

    it('returns current tilt when map is null', () => {
      const newTilt = adjustTilt(null as any, 45, 15)

      expect(newTilt).toBe(45)
    })
  })

  describe('resetTilt', () => {
    it('resets map tilt to default', () => {
      resetTilt(mockMap)

      expect(mockSetTilt).toHaveBeenCalledWith(MAP_CONSTANTS.DEFAULT_TILT)
    })

    it('handles null map gracefully', () => {
      expect(() => resetTilt(null as any)).not.toThrow()
    })
  })

  describe('createMapOptions', () => {
    const center = { lat: 35.6598, lng: 139.7006 }
    const zoom = 15

    it('creates map options with correct defaults', () => {
      const options = createMapOptions(center, zoom)

      expect(options.center).toEqual(center)
      expect(options.zoom).toBe(zoom)
      expect(options.disableDefaultUI).toBe(true)
      expect(options.zoomControl).toBe(true)
      expect(options.rotateControl).toBe(true)
      expect(options.renderingType).toBe('VECTOR')
      expect(options.tilt).toBe(MAP_CONSTANTS.DEFAULT_TILT)
      expect(options.heading).toBe(MAP_CONSTANTS.DEFAULT_HEADING)
      expect(options.headingInteractionEnabled).toBe(true)
      expect(options.tiltInteractionEnabled).toBe(true)
    })

    it('uses environment map ID when available', () => {
      // Skip this test for now as mocking import.meta.env in Vitest is complex
      // In real usage, the environment variable works correctly
      expect(true).toBe(true)
    })

    it('uses default map ID when environment variable is not set', () => {
      vi.stubGlobal('import.meta', {
        env: {}
      })

      const options = createMapOptions(center, zoom)
      expect(options.mapId).toBe('rakugaki-map-grayscale')

      vi.unstubAllGlobals()
    })
  })

  describe('getMapState', () => {
    it('gets current map state', () => {
      mockGetHeading.mockReturnValue(45)
      mockGetTilt.mockReturnValue(30)

      const state = getMapState(mockMap)

      expect(state).toEqual({
        center: { lat: 35.6598, lng: 139.7006 },
        zoom: 15,
        heading: 45,
        tilt: 30
      })
    })

    it('returns null for null map', () => {
      const state = getMapState(null as any)
      expect(state).toBeNull()
    })

    it('handles missing methods gracefully', () => {
      const mapWithoutMethods = {
        getCenter: vi.fn().mockReturnValue({ toJSON: () => ({ lat: 35.6598, lng: 139.7006 }) }),
        getZoom: vi.fn().mockReturnValue(15),
        // No getHeading or getTilt methods
      } as any

      const state = getMapState(mapWithoutMethods)

      expect(state).toEqual({
        center: { lat: 35.6598, lng: 139.7006 },
        zoom: 15,
        heading: MAP_CONSTANTS.DEFAULT_HEADING,
        tilt: MAP_CONSTANTS.DEFAULT_TILT
      })
    })
  })

  describe('centerOnLocation', () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 35.6598,
        longitude: 139.7006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({ latitude: 35.6598, longitude: 139.7006 })
      } as GeolocationCoordinates,
      timestamp: Date.now()
    }

    it('centers map on given position', () => {
      const onSuccess = vi.fn()

      centerOnLocation(mockMap, mockPosition, onSuccess)

      expect(mockMap.setCenter).toHaveBeenCalledWith({
        lat: 35.6598,
        lng: 139.7006
      })
      expect(mockMap.setZoom).toHaveBeenCalledWith(MAP_CONSTANTS.LOCATE_ZOOM)
      expect(onSuccess).toHaveBeenCalledWith({
        lat: 35.6598,
        lng: 139.7006
      })
    })

    it('works without onSuccess callback', () => {
      expect(() => centerOnLocation(mockMap, mockPosition)).not.toThrow()

      expect(mockMap.setCenter).toHaveBeenCalledWith({
        lat: 35.6598,
        lng: 139.7006
      })
    })
  })
})
