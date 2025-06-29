import { useState, useCallback } from 'react'
import { MAP_CONSTANTS } from '../constants/map'
import { rotateMap as rotateMapUtil, adjustTilt as adjustTiltUtil, resetMapRotation as resetRotationUtil, resetTilt as resetTiltUtil, centerOnLocation } from '../utils/mapUtils'

export interface UseMapReturn {
  map: google.maps.Map | null
  center: { lat: number, lng: number }
  zoom: number
  mapHeading: number
  mapTilt: number
  isLocating: boolean
  onLoad: (map: google.maps.Map) => void
  onUnmount: () => void
  handleLocateMe: () => void
  rotateMap: (degrees: number) => void
  resetMapRotation: () => void
  adjustTilt: (degrees: number) => void
  resetTilt: () => void
  getCurrentMapState: () => { center: { lat: number, lng: number }, zoom: number }
  setCenter: (center: { lat: number, lng: number }) => void
  setZoom: (zoom: number) => void
}

const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503
}

export const useMap = (): UseMapReturn => {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [center, setCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState<number>(MAP_CONSTANTS.DEFAULT_ZOOM)
  const [mapHeading, setMapHeading] = useState<number>(MAP_CONSTANTS.DEFAULT_HEADING)
  const [mapTilt, setMapTilt] = useState<number>(MAP_CONSTANTS.DEFAULT_TILT)
  const [isLocating, setIsLocating] = useState(false)

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const getCurrentMapState = useCallback(() => {
    if (map) {
      const mapCenter = map.getCenter()
      const mapZoom = map.getZoom()
      return {
        center: mapCenter ? { lat: mapCenter.lat(), lng: mapCenter.lng() } : center,
        zoom: mapZoom || zoom
      }
    }
    return { center, zoom }
  }, [map, center, zoom])

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('このブラウザでは位置情報がサポートされていません')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (map) {
          centerOnLocation(map, position, (newCenter) => {
            setCenter(newCenter)
            setZoom(MAP_CONSTANTS.LOCATE_ZOOM)
          })
        }
        setIsLocating(false)
      },
      (error) => {
        console.error('位置情報の取得に失敗しました:', error)
        let message = '位置情報の取得に失敗しました'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '位置情報の使用が拒否されました'
            break
          case error.POSITION_UNAVAILABLE:
            message = '位置情報が利用できません'
            break
          case error.TIMEOUT:
            message = '位置情報の取得がタイムアウトしました'
            break
        }
        alert(message)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }, [map])

  const rotateMap = useCallback((degrees: number) => {
    if (!map) return
    const newHeading = rotateMapUtil(map, mapHeading, degrees)
    setMapHeading(newHeading)
  }, [map, mapHeading])

  const resetMapRotation = useCallback(() => {
    if (!map) return
    resetRotationUtil(map)
    setMapHeading(MAP_CONSTANTS.DEFAULT_HEADING)
  }, [map])

  const adjustTilt = useCallback((degrees: number) => {
    if (!map) return
    const newTilt = adjustTiltUtil(map, mapTilt, degrees)
    setMapTilt(newTilt)
  }, [map, mapTilt])

  const resetTilt = useCallback(() => {
    if (!map) return
    resetTiltUtil(map)
    setMapTilt(MAP_CONSTANTS.DEFAULT_TILT)
  }, [map])

  return {
    map,
    center,
    zoom,
    mapHeading,
    mapTilt,
    isLocating,
    onLoad,
    onUnmount,
    handleLocateMe,
    rotateMap,
    resetMapRotation,
    adjustTilt,
    resetTilt,
    getCurrentMapState,
    setCenter,
    setZoom
  }
}
