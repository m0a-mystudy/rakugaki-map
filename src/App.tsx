import { useState, useCallback } from 'react'
import { GoogleMap, LoadScript } from '@react-google-maps/api'
import DrawingCanvas from './components/DrawingCanvas'
import './App.css'

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
}

const center = {
  lat: 35.6762,
  lng: 139.6503
}

const options = {
  disableDefaultUI: true,
  zoomControl: true,
}

function App() {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  return (
    <div className="app">
      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
        <div className="map-container">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={options}
          />
          {map && (
            <DrawingCanvas 
              map={map} 
              isDrawing={isDrawing}
              onDrawingChange={setIsDrawing}
            />
          )}
        </div>
      </LoadScript>
      <div className="controls">
        <button 
          className={`draw-button ${isDrawing ? 'active' : ''}`}
          onClick={() => setIsDrawing(!isDrawing)}
        >
          {isDrawing ? '描画を終了' : '描画を開始'}
        </button>
      </div>
    </div>
  )
}

export default App