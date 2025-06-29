import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMap } from '../useMap'
import { MAP_CONSTANTS } from '../../constants/map'

// Mock the mapUtils functions
vi.mock('../../utils/mapUtils', () => ({
  createMapOptions: vi.fn().mockReturnValue({}),
  rotateMap: vi.fn().mockImplementation((_map: any, currentHeading: number, degrees: number) => {
    return ((currentHeading + degrees) % 360 + 360) % 360
  }),
  adjustTilt: vi.fn().mockImplementation((_map: any, currentTilt: number, degrees: number) => {
    return Math.max(0, Math.min(67.5, currentTilt + degrees))
  }),
  resetMapRotation: vi.fn(),
  resetTilt: vi.fn(),
  centerOnLocation: vi.fn().mockImplementation((_map: any, position: any, callback: any) => {
    callback({ lat: position.coords.latitude, lng: position.coords.longitude })
  })
}))

describe('useMap', () => {
  let mockMap: google.maps.Map
  let mockGeolocation: any

  beforeEach(() => {
    // Mock Google Maps
    mockMap = {
      getCenter: vi.fn().mockReturnValue({
        lat: () => 35.6762,
        lng: () => 139.6503
      }),
      getZoom: vi.fn().mockReturnValue(15),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      setHeading: vi.fn(),
      setTilt: vi.fn()
    } as any

    // Mock geolocation
    mockGeolocation = {
      getCurrentPosition: vi.fn()
    }
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true
    })
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useMap())

    expect(result.current.map).toBeNull()
    expect(result.current.center).toEqual({ lat: 35.6762, lng: 139.6503 })
    expect(result.current.zoom).toBe(MAP_CONSTANTS.DEFAULT_ZOOM)
    expect(result.current.mapHeading).toBe(MAP_CONSTANTS.DEFAULT_HEADING)
    expect(result.current.mapTilt).toBe(MAP_CONSTANTS.DEFAULT_TILT)
    expect(result.current.isLocating).toBe(false)
  })

  it('handles map load and unmount', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.onLoad(mockMap)
    })

    expect(result.current.map).toBe(mockMap)

    act(() => {
      result.current.onUnmount()
    })

    expect(result.current.map).toBeNull()
  })

  it('gets current map state', () => {
    const { result } = renderHook(() => useMap())

    // Without map loaded
    const stateWithoutMap = result.current.getCurrentMapState()
    expect(stateWithoutMap).toEqual({
      center: { lat: 35.6762, lng: 139.6503 },
      zoom: MAP_CONSTANTS.DEFAULT_ZOOM
    })

    // With map loaded
    act(() => {
      result.current.onLoad(mockMap)
    })

    const stateWithMap = result.current.getCurrentMapState()
    expect(stateWithMap).toEqual({
      center: { lat: 35.6762, lng: 139.6503 },
      zoom: 15
    })
  })

  it('rotates map correctly', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.onLoad(mockMap)
    })

    act(() => {
      result.current.rotateMap(45)
    })

    expect(result.current.mapHeading).toBe(45)

    act(() => {
      result.current.rotateMap(90)
    })

    expect(result.current.mapHeading).toBe(135)

    act(() => {
      result.current.rotateMap(-180)
    })

    expect(result.current.mapHeading).toBe(315)
  })

  it('resets map rotation', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.onLoad(mockMap)
    })

    act(() => {
      result.current.rotateMap(90)
    })

    expect(result.current.mapHeading).toBe(90)

    act(() => {
      result.current.resetMapRotation()
    })

    expect(result.current.mapHeading).toBe(MAP_CONSTANTS.DEFAULT_HEADING)
  })

  it('adjusts tilt correctly', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.onLoad(mockMap)
    })

    act(() => {
      result.current.adjustTilt(15)
    })

    expect(result.current.mapTilt).toBe(15)

    act(() => {
      result.current.adjustTilt(60)
    })

    expect(result.current.mapTilt).toBe(67.5) // Clamped to max

    act(() => {
      result.current.adjustTilt(-70)
    })

    expect(result.current.mapTilt).toBe(0) // Clamped to min
  })

  it('resets tilt', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.onLoad(mockMap)
    })

    act(() => {
      result.current.adjustTilt(45)
    })

    expect(result.current.mapTilt).toBe(45)

    act(() => {
      result.current.resetTilt()
    })

    expect(result.current.mapTilt).toBe(MAP_CONSTANTS.DEFAULT_TILT)
  })

  it('handles location request when geolocation is not supported', () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true
    })

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.handleLocateMe()
    })

    expect(alertSpy).toHaveBeenCalledWith('このブラウザでは位置情報がサポートされていません')
    expect(result.current.isLocating).toBe(false)

    alertSpy.mockRestore()
  })

  it('handles successful location request', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.onLoad(mockMap)
    })

    mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
      success({
        coords: {
          latitude: 35.6895,
          longitude: 139.6917
        }
      })
    })

    act(() => {
      result.current.handleLocateMe()
    })

    expect(result.current.center).toEqual({ lat: 35.6895, lng: 139.6917 })
    expect(result.current.zoom).toBe(MAP_CONSTANTS.LOCATE_ZOOM)
    expect(result.current.isLocating).toBe(false)
  })

  it('handles location request error', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { result } = renderHook(() => useMap())

    mockGeolocation.getCurrentPosition.mockImplementation((_: any, error: any) => {
      error({
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1
      })
    })

    act(() => {
      result.current.handleLocateMe()
    })

    expect(alertSpy).toHaveBeenCalledWith('位置情報の使用が拒否されました')
    expect(result.current.isLocating).toBe(false)

    alertSpy.mockRestore()
  })

  it('updates center and zoom', () => {
    const { result } = renderHook(() => useMap())

    act(() => {
      result.current.setCenter({ lat: 34.6937, lng: 135.5023 })
    })

    expect(result.current.center).toEqual({ lat: 34.6937, lng: 135.5023 })

    act(() => {
      result.current.setZoom(18)
    })

    expect(result.current.zoom).toBe(18)
  })
})
