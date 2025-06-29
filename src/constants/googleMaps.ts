import { Libraries } from '@react-google-maps/api'

export const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100vh'
}

export const DEFAULT_CENTER = {
  lat: 35.6762,
  lng: 139.6503
}

// Static libraries array to prevent reloading warning
export const LIBRARIES: Libraries = ['places']
