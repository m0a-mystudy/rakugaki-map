import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, LoadScript } from '@react-google-maps/api'
import DrawingCanvas from './components/DrawingCanvas'
import { generateDrawingId, saveDrawing, loadDrawing } from './services/drawingService'
import type { DrawingTool, Shape } from './types'
import './App.css'

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
}

const defaultCenter = {
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
  const [selectedColor, setSelectedColor] = useState('#ff4757')
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('pen')
  const [lineWidth, setLineWidth] = useState(3)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [drawingId, setDrawingId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [center, setCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState(15)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const id = urlParams.get('id')

    if (id) {
      setDrawingId(id)
      loadDrawingData(id)
    } else {
      const newId = generateDrawingId()
      setDrawingId(newId)
      window.history.replaceState({}, '', `?id=${newId}`)
    }
  }, [])

  const loadDrawingData = async (id: string) => {
    try {
      const data = await loadDrawing(id)
      if (data) {
        setShapes(data.shapes)
        setCenter(data.center)
        setZoom(data.zoom)
      }
    } catch (error) {
      console.error('Failed to load drawing:', error)
    }
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  // 地図の状態を取得するヘルパー関数
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

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleSave = async () => {
    console.log('🔥 Save button clicked', { drawingId, shapesCount: shapes.length })

    if (!drawingId) {
      console.error('❌ No drawing ID')
      return
    }

    if (shapes.length === 0) {
      console.warn('⚠️ No shapes to save')
      return
    }

    setIsSaving(true)
    try {
      // 保存時に現在の地図状態を取得
      const currentMapState = getCurrentMapState()
      await saveDrawing(drawingId, shapes, currentMapState.center, currentMapState.zoom)
      alert('Drawing saved successfully!')
    } catch (error) {
      console.error('Failed to save drawing:', error)
      alert(`Save failed: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    if (confirm('すべての描画を削除しますか？')) {
      setShapes([])
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('共有リンクをコピーしました！')
  }

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
            zoom={zoom}
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
              shapes={shapes}
              onShapesChange={setShapes}
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

        <div className="action-buttons">
          <button
            className="action-button save"
            onClick={handleSave}
            disabled={isSaving || shapes.length === 0}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            className="action-button clear"
            onClick={handleClear}
            disabled={shapes.length === 0}
          >
            クリア
          </button>
          <button
            className="action-button share"
            onClick={handleShare}
          >
            共有
          </button>
        </div>

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
