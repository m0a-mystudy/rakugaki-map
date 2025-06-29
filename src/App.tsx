import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, LoadScript, Libraries } from '@react-google-maps/api'
import DrawingCanvas from './components/DrawingCanvas'
import { generateDrawingId, saveDrawing, loadDrawing } from './services/drawingService'
import { initializeAuth, onAuthChange } from './firebase'
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

// Static libraries array to prevent reloading warning
const libraries: Libraries = ['places']

const options: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: true, // Enable rotate control
  fullscreenControl: false,
  // Force vector rendering with proper Map ID
  mapId: '8e0a97af9e0a7f95', // Google's official vector map demo ID
  renderingType: 'VECTOR' as google.maps.RenderingType, // Force vector rendering
  mapTypeId: 'roadmap',
  // Enable rotation and tilt
  tilt: 45,
  heading: 0,
  // Enable heading interaction
  headingInteractionEnabled: true,
  tiltInteractionEnabled: true,
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
  const [lastShapeCount, setLastShapeCount] = useState(0)
  const [center, setCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState(15)
  const [user, setUser] = useState<any>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [hasCurrentDrawing, setHasCurrentDrawing] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [mapHeading, setMapHeading] = useState(0)

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

  // 認証の初期化
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user)
      if (user) {
        console.log('🔥 User authenticated:', user.uid)
      } else {
        console.log('🔥 User not authenticated, signing in anonymously...')
        initializeAuth().catch(console.error)
      }
    })

    return () => unsubscribe()
  }, [])

  // 描画完了時の自動保存
  useEffect(() => {
    // 初回ロード時やshapesが減った場合（クリア等）は保存しない
    if (shapes.length === 0 || shapes.length <= lastShapeCount) {
      setLastShapeCount(shapes.length)
      return
    }

    // 新しい描画が追加された場合のみ自動保存
    if (shapes.length > lastShapeCount) {
      setLastShapeCount(shapes.length)
      handleAutoSave()
    }
  }, [shapes, lastShapeCount, user, drawingId])

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

  const handleAutoSave = async () => {
    console.log('🔥 Auto-saving drawing', { drawingId, shapesCount: shapes.length, user: user?.uid })

    if (!user) {
      console.log('⚠️ User not authenticated, skipping auto-save')
      return
    }

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
      console.log('✅ Drawing auto-saved successfully')
    } catch (error) {
      console.error('Failed to auto-save drawing:', error)
      // 自動保存のエラーはアラートを出さない（ユーザー体験を損なわないため）
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    if (confirm('すべての描画を削除しますか？')) {
      setShapes([])
      setHasCurrentDrawing(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('共有リンクをコピーしました！')
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('このブラウザでは位置情報がサポートされていません')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const newCenter = { lat, lng }

        setCenter(newCenter)
        if (map) {
          map.panTo(newCenter)
          map.setZoom(16)
          setZoom(16)
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
  }

  const handleMenuMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on a button
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return
    }
    setIsDragging(true)
    setDragStart({
      x: e.clientX - menuPosition.x,
      y: e.clientY - menuPosition.y
    })
  }

  const handleMenuMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setMenuPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMenuMouseUp = () => {
    setIsDragging(false)
  }

  const handleMenuTouchStart = (e: React.TouchEvent) => {
    // Don't start dragging if touching a button
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return
    }
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({
      x: touch.clientX - menuPosition.x,
      y: touch.clientY - menuPosition.y
    })
    e.preventDefault()
  }

  const handleMenuTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    setMenuPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    })
    e.preventDefault()
  }

  const handleMenuTouchEnd = () => {
    setIsDragging(false)
  }

  const rotateMap = (degrees: number) => {
    console.log('rotateMap called with degrees:', degrees, 'isDragging:', isDragging)
    if (!map) {
      console.error('Map is null')
      return
    }

    // Check map methods and rendering type
    console.log('Map object:', map)
    console.log('setHeading exists?', typeof map.setHeading)
    console.log('setTilt exists?', typeof map.setTilt)
    console.log('getHeading exists?', typeof map.getHeading)
    console.log('Map rendering type:', map.getRenderingType ? map.getRenderingType() : 'unknown')
    // Check Map ID if available
    const mapWithId = map as google.maps.Map & { getMapId?: () => string }
    console.log('Map ID:', mapWithId.getMapId ? mapWithId.getMapId() : 'no mapId method')

    const currentHeading = typeof map.getHeading === 'function' ? map.getHeading() : 0
    console.log('Current heading:', currentHeading)

    const newHeading = (mapHeading + degrees) % 360
    console.log('New heading will be:', newHeading)
    setMapHeading(newHeading)

    try {
      // Try different approaches
      if (typeof map.setHeading === 'function') {
        console.log('Calling setHeading with:', newHeading)
        map.setHeading(newHeading)
        // Also try setting tilt
        if (typeof map.setTilt === 'function') {
          map.setTilt(45) // Try with tilt
        }
        console.log('After setHeading, heading is:', map.getHeading ? map.getHeading() : 'unknown')
      } else {
        console.log('setHeading not available, trying setOptions')
        map.setOptions({
          heading: newHeading,
          tilt: 45
        })
      }
    } catch (error) {
      console.error('Failed to rotate map:', error)
    }
  }

  const resetMapRotation = () => {
    if (!map) return
    setMapHeading(0)
    try {
      // Use setHeading method for vector maps
      if (typeof map.setHeading === 'function') {
        map.setHeading(0)
        console.log('Reset using setHeading method')
      } else {
        // Fallback to setOptions
        map.setOptions({
          heading: 0
        })
        console.log('Reset using setOptions method')
      }
    } catch (error) {
      console.error('Failed to reset map rotation:', error)
    }
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
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
        version="beta"
        libraries={libraries}
      >
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
              onCurrentDrawingChange={setHasCurrentDrawing}
            />
          )}
        </div>
      </LoadScript>
      <div
        className={`controls ${isDragging ? 'dragging' : ''}`}
        style={{
          position: 'absolute',
          top: `${menuPosition.y}px`,
          right: 'auto',
          left: `${menuPosition.x}px`
        }}
        onMouseDown={handleMenuMouseDown}
        onMouseMove={handleMenuMouseMove}
        onMouseUp={handleMenuMouseUp}
        onMouseLeave={handleMenuMouseUp}
        onTouchStart={handleMenuTouchStart}
        onTouchMove={handleMenuTouchMove}
        onTouchEnd={handleMenuTouchEnd}
      >
        <button
          className={`draw-button ${isDrawing ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (!isDragging) setIsDrawing(!isDrawing)
          }}
        >
          {isDrawing ? '描画を終了' : '描画を開始'}
        </button>

        <div className="action-buttons">
          <button
            className="action-button locate"
            onClick={(e) => {
              e.stopPropagation()
              if (!isDragging) handleLocateMe()
            }}
            disabled={isLocating}
          >
            {isLocating ? '📍 取得中...' : '📍 現在地'}
          </button>
          <div className="rotation-controls">
            <button
              className="action-button rotate-left"
              onClick={(e) => {
                console.log('Left rotate button clicked')
                e.stopPropagation()
                if (!isDragging) rotateMap(-45)
              }}
              title="左に45度回転"
            >
              ↺
            </button>
            <button
              className="action-button rotate-right"
              onClick={(e) => {
                console.log('Right rotate button clicked')
                e.stopPropagation()
                if (!isDragging) rotateMap(45)
              }}
              title="右に45度回転"
            >
              ↻
            </button>
            <button
              className="action-button reset-rotation"
              onClick={(e) => {
                console.log('Reset rotation button clicked')
                e.stopPropagation()
                if (!isDragging) resetMapRotation()
              }}
              title="回転をリセット"
            >
              🧭
            </button>
          </div>
          <button
            className="action-button clear"
            onClick={(e) => {
              e.stopPropagation()
              if (!isDragging) handleClear()
            }}
            disabled={shapes.length === 0 && !hasCurrentDrawing}
          >
            クリア
          </button>
          <button
            className="action-button share"
            onClick={(e) => {
              e.stopPropagation()
              if (!isDragging) handleShare()
            }}
          >
            共有
          </button>
          {isSaving && (
            <div className="saving-indicator">
              💾 保存中...
            </div>
          )}
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
