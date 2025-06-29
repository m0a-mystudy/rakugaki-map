// Map-related constants
export const MAP_CONSTANTS = {
  // Zoom levels
  DEFAULT_ZOOM: 15,           // Default zoom level for new drawings
  LOCATE_ZOOM: 16,           // Zoom level when centering on user location
  DEFAULT_BASE_ZOOM: 15,     // Default base zoom for line width scaling (for backward compatibility)

  // Map rendering
  DEFAULT_TILT: 0,           // Default tilt angle (0 = no tilt)
  DEFAULT_HEADING: 0,        // Default heading (north)

  // Drawing
  CIRCLE_SEGMENTS: 120,       // Number of segments to approximate a circle
} as const

// Type for the constants
export type MapConstants = typeof MAP_CONSTANTS
