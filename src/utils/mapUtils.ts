import { MAP_CONSTANTS } from '../constants/map'

/**
 * Safely call a map method, falling back to setOptions if the method doesn't exist
 */
export const safeMapMethodCall = (
  map: google.maps.Map,
  methodName: keyof google.maps.Map,
  value: any,
  optionsKey: string
): void => {
  try {
    const method = map[methodName] as any
    if (typeof method === 'function') {
      method.call(map, value)
    } else {
      // Fallback to setOptions
      map.setOptions({ [optionsKey]: value })
    }
  } catch (error) {
    console.error(`Failed to call ${String(methodName)}:`, error)
    // Final fallback to setOptions
    try {
      map.setOptions({ [optionsKey]: value })
    } catch (optionsError) {
      console.error(`Failed to set ${optionsKey} via options:`, optionsError)
    }
  }
}

/**
 * Rotate the map by a specified number of degrees
 */
export const rotateMap = (
  map: google.maps.Map,
  currentHeading: number,
  degrees: number
): number => {
  if (!map) {
    console.error('Map is null')
    return currentHeading
  }

  const newHeading = ((currentHeading + degrees) % 360 + 360) % 360
  safeMapMethodCall(map, 'setHeading', newHeading, 'heading')

  return newHeading
}

/**
 * Reset map rotation to north (0 degrees)
 */
export const resetMapRotation = (map: google.maps.Map): void => {
  if (!map) return

  safeMapMethodCall(map, 'setHeading', MAP_CONSTANTS.DEFAULT_HEADING, 'heading')
}

/**
 * Adjust map tilt by specified degrees
 */
export const adjustTilt = (
  map: google.maps.Map,
  currentTilt: number,
  degrees: number
): number => {
  if (!map) return currentTilt

  const newTilt = Math.max(0, Math.min(67.5, currentTilt + degrees))
  safeMapMethodCall(map, 'setTilt', newTilt, 'tilt')

  return newTilt
}

/**
 * Reset map tilt to flat (0 degrees)
 */
export const resetTilt = (map: google.maps.Map): void => {
  if (!map) return

  safeMapMethodCall(map, 'setTilt', MAP_CONSTANTS.DEFAULT_TILT, 'tilt')
}

/**
 * Create Google Maps options with consistent configuration
 */
export const createMapOptions = (
  center: google.maps.LatLngLiteral,
  zoom: number,
  allowedDomains: string[] = []
): google.maps.MapOptions => {
  // Determine map ID based on environment
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'rakugaki-map-grayscale'

  return {
    zoom,
    center,
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: true,
    fullscreenControl: false,
    mapId: mapId,
    renderingType: 'VECTOR' as google.maps.RenderingType,
    tilt: MAP_CONSTANTS.DEFAULT_TILT,
    heading: MAP_CONSTANTS.DEFAULT_HEADING,
    headingInteractionEnabled: true,
    tiltInteractionEnabled: true,
  }
}

/**
 * Get current map state for saving/loading
 */
export const getMapState = (map: google.maps.Map) => {
  if (!map) return null

  return {
    center: map.getCenter()?.toJSON() || { lat: 0, lng: 0 },
    zoom: map.getZoom() || MAP_CONSTANTS.DEFAULT_ZOOM,
    heading: typeof map.getHeading === 'function' ? map.getHeading() : MAP_CONSTANTS.DEFAULT_HEADING,
    tilt: typeof map.getTilt === 'function' ? map.getTilt() : MAP_CONSTANTS.DEFAULT_TILT,
  }
}

/**
 * Center map on user's current location
 */
export const centerOnLocation = (
  map: google.maps.Map,
  position: GeolocationPosition,
  onSuccess?: (center: google.maps.LatLngLiteral) => void
): void => {
  const center = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  }

  map.setCenter(center)
  map.setZoom(MAP_CONSTANTS.LOCATE_ZOOM)

  onSuccess?.(center)
}
