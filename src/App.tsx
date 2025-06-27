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

export type DrawingTool = 'pen' | 'rectangle' | 'circle' | 'line'

function App() {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#ff4757')
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('pen')
  const [lineWidth, setLineWidth] = useState(3)

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const colors = [
    '#ff4757', // 赤
    '#3742fa', // 青
    '#2ed573', // 緑
    '#ffa502', // オレンジ
    '#ff6348', // ピンク
    '#5f27cd', // 紫
    '#000000', // 黒
    '#747d8c', // グレー
  ]

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
              selectedColor={selectedColor}
              selectedTool={selectedTool}
              lineWidth={lineWidth}
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
        
        {isDrawing && (
          <>
            <div className="tool-section">
              <h3>ツール</h3>
              <div className="tool-buttons">
                <button
                  className={`tool-button ${selectedTool === 'pen' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('pen')}
                  title="ペン"
                >
                  ✏️
                </button>
                <button
                  className={`tool-button ${selectedTool === 'line' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('line')}
                  title="直線"
                >
                  📏
                </button>
                <button
                  className={`tool-button ${selectedTool === 'rectangle' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('rectangle')}
                  title="四角形"
                >
                  ◻️
                </button>
                <button
                  className={`tool-button ${selectedTool === 'circle' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('circle')}
                  title="円"
                >
                  ⭕
                </button>
              </div>
            </div>

            <div className="color-section">
              <h3>色</h3>
              <div className="color-palette">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`color-button ${selectedColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="width-section">
              <h3>線の太さ: {lineWidth}px</h3>
              <input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="width-slider"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App