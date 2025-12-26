import { useState } from 'react'
import { GoogleMap, LoadScript } from '@react-google-maps/api'
import DrawingCanvasV2 from './components/DrawingCanvasV2'
import LayerPanel from './components/LayerPanel'
import { useAuthManager } from './hooks/useAuthManager'
import { useMap } from './hooks/useMap'
import { useDrawingV2 } from './hooks/useDrawingV2'
import { useMenu } from './hooks/useMenu'
import { DRAWING_COLORS } from './constants/drawing'
import { MAP_CONTAINER_STYLE, LIBRARIES } from './constants/googleMaps'
import {
  MenuIcon, MinimizeIcon, LocationIcon, RotateLeftIcon, RotateRightIcon,
  CompassIcon, ChevronUpIcon, ChevronDownIcon, LayersIcon, PenIcon, HandIcon,
  LineIcon, SquareIcon, CircleIcon, EraserIcon, SaveIcon, ShareIcon,
  ArrowUpIcon, ArrowRightIcon, UndoIcon, RedoIcon
} from './components/Icons'
import './App.css'

// Log environment variables for debugging
console.log('🗺️ Map configuration:')
console.log('  VITE_MAP_ID:', import.meta.env.VITE_MAP_ID)
console.log('  All env vars:', import.meta.env)

const mapId = import.meta.env.VITE_MAP_ID || '8e0a97af9e0a7f95'
console.log('  Using mapId:', mapId)

/**
 * Static Google Maps options configuration.
 * Created once outside component to prevent "renderingType after instantiation" error.
 * Uses VECTOR rendering for rotation/tilt support and custom grayscale styling.
 */
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: false,
  mapId: import.meta.env.VITE_MAP_ID || '8e0a97af9e0a7f95',
  renderingType: 'VECTOR' as google.maps.RenderingType,
  tilt: 0,
  heading: 0,
  headingInteractionEnabled: true,
  tiltInteractionEnabled: true,
}

/**
 * Main App component for the Rakugaki Map drawing application.
 *
 * Orchestrates custom hooks for modular state management:
 * - useAuthManager: Firebase authentication
 * - useMap: Google Maps controls and state
 * - useDrawing: Drawing tools and smart auto-save
 * - useMenu: UI menu positioning
 *
 * Reduced from 597 to 296 lines (50% reduction) through hook extraction.
 */
function App() {
  // Firebase authentication
  const { user } = useAuthManager()

  // Google Maps state and controls
  const {
    map,
    center,
    zoom,
    isLocating,
    onLoad,
    onUnmount,
    handleLocateMe,
    rotateMap,
    resetMapRotation,
    adjustTilt,
    resetTilt,
    getCurrentMapState
  } = useMap()

  // Drawing state and smart auto-save (V2 - tile-based)
  const {
    layers,
    activeLayerId,
    baseZoom,
    selectedColor,
    selectedTool,
    lineWidth,
    isDrawing,
    isSaving,
    tileCache,
    setSelectedColor,
    setSelectedTool,
    setLineWidth,
    setIsDrawing,
    setHasCurrentDrawing,
    handleShare,
    onDrawingComplete,
    undo,
    redo,
    canUndo,
    canRedo,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayers,
    toggleLayerVisibility,
    toggleLayerLock
  } = useDrawingV2(user, getCurrentMapState)

  // UI menu state
  const {
    menuPosition,
    isMenuMinimized,
    toggleMenuPosition,
    toggleMenuMinimize
  } = useMenu()

  // Layer panel state
  const [isLayerPanelVisible, setIsLayerPanelVisible] = useState(false)


  return (
    <div className="app">
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}
        version="beta"
        libraries={LIBRARIES}
        loadingElement={<div>Loading Maps...</div>}
      >
        <div className="map-container">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={center}
            zoom={zoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={MAP_OPTIONS}
          />
          {map && (
            <DrawingCanvasV2
              map={map}
              isDrawing={isDrawing}
              selectedColor={selectedColor}
              selectedTool={selectedTool}
              lineWidth={lineWidth}
              layers={layers}
              activeLayerId={activeLayerId}
              baseZoom={baseZoom}
              tileCache={tileCache}
              onDrawingComplete={onDrawingComplete}
              onCurrentDrawingChange={setHasCurrentDrawing}
            />
          )}
        </div>
      </LoadScript>
      <div className={`controls ${menuPosition} ${isMenuMinimized ? 'minimized' : ''}`}>
        {isMenuMinimized ? (
          <button
            className="minimized-icon"
            onClick={toggleMenuMinimize}
            title="メニューを展開"
          >
            <MenuIcon size={24} />
          </button>
        ) : (
          <>
            <div className="menu-header">
              <button
                className="menu-toggle"
                onClick={toggleMenuPosition}
                title="メニュー位置を切り替え"
              >
                {menuPosition === 'right' ? <ArrowUpIcon size={16} /> : <ArrowRightIcon size={16} />}
              </button>
              <button
                className="minimize-toggle"
                onClick={toggleMenuMinimize}
                title="メニューを最小化"
              >
                <MinimizeIcon size={16} />
              </button>
              <button
                className={`draw-button ${isDrawing ? 'active' : ''}`}
                onClick={() => setIsDrawing(!isDrawing)}
              >
                {isDrawing ? '描画を終了' : '描画を開始'}
              </button>
            </div>

            <div className="action-buttons">
              {!isDrawing && (
                <>
                  <button
                    className="action-button locate"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                  >
                    <LocationIcon size={16} />
                    {isLocating ? ' 取得中...' : ' 現在地'}
                  </button>
                  <div className="rotation-controls">
                    <button
                      className="action-button rotate-left"
                      onClick={() => rotateMap(-45)}
                      title="左に45度回転"
                    >
                      <RotateLeftIcon size={16} />
                    </button>
                    <button
                      className="action-button rotate-right"
                      onClick={() => rotateMap(45)}
                      title="右に45度回転"
                    >
                      <RotateRightIcon size={16} />
                    </button>
                    <button
                      className="action-button reset-rotation"
                      onClick={resetMapRotation}
                      title="回転をリセット"
                    >
                      <CompassIcon size={16} />
                    </button>
                  </div>
                  <div className="tilt-controls">
                    <button
                      className="action-button tilt-up"
                      onClick={() => adjustTilt(15)}
                      title="チルトアップ（15度）"
                    >
                      <ChevronUpIcon size={16} />
                    </button>
                    <button
                      className="action-button tilt-down"
                      onClick={() => adjustTilt(-15)}
                      title="チルトダウン（15度）"
                    >
                      <ChevronDownIcon size={16} />
                    </button>
                    <button
                      className="action-button reset-tilt"
                      onClick={resetTilt}
                      title="チルトリセット（平面表示）"
                    >
                      <CompassIcon size={16} />
                    </button>
                  </div>
                  <button
                    className="action-button share"
                    onClick={handleShare}
                  >
                    <ShareIcon size={16} />
                    共有
                  </button>
                </>
              )}
              {isSaving && (
                <div className="saving-indicator">
                  <SaveIcon size={16} />
                  保存中...
                </div>
              )}
            </div>

            {isDrawing && (
              <>
            <div className="tool-section">
              <h3>ツール</h3>
              <div className="tool-buttons">
                <button
                  className={`tool-button ${isLayerPanelVisible ? 'active' : ''}`}
                  onClick={() => setIsLayerPanelVisible(!isLayerPanelVisible)}
                  title="レイヤー"
                >
                  <LayersIcon size={20} />
                </button>
                <button
                  className={`tool-button ${selectedTool === 'pan' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('pan')}
                  title="移動"
                >
                  <HandIcon size={20} />
                </button>
                <button
                  className={`tool-button ${selectedTool === 'pen' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('pen')}
                  title="ペン"
                >
                  <PenIcon size={20} />
                </button>
                <button
                  className={`tool-button ${selectedTool === 'line' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('line')}
                  title="直線"
                >
                  <LineIcon size={20} />
                </button>
                <button
                  className={`tool-button ${selectedTool === 'rectangle' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('rectangle')}
                  title="四角形"
                >
                  <SquareIcon size={20} />
                </button>
                <button
                  className={`tool-button ${selectedTool === 'circle' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('circle')}
                  title="円"
                >
                  <CircleIcon size={20} />
                </button>
                <button
                  className={`tool-button ${selectedTool === 'eraser' ? 'active' : ''}`}
                  onClick={() => setSelectedTool('eraser')}
                  title="消しゴム"
                >
                  <EraserIcon size={20} />
                </button>
              </div>
            </div>

            <div className="history-section">
              <div className="history-buttons">
                <button
                  className={`tool-button ${canUndo ? '' : 'disabled'}`}
                  onClick={undo}
                  disabled={!canUndo}
                  title="元に戻す"
                >
                  <UndoIcon size={20} />
                </button>
                <button
                  className={`tool-button ${canRedo ? '' : 'disabled'}`}
                  onClick={redo}
                  disabled={!canRedo}
                  title="やり直し"
                >
                  <RedoIcon size={20} />
                </button>
              </div>
            </div>

            <div className="color-section">
              <h3>色</h3>
              <div className="color-palette">
                {DRAWING_COLORS.map(color => (
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
          </>
        )}
      </div>

      {/* Layer Panel */}
      <LayerPanel
        layers={layers}
        activeLayerId={activeLayerId}
        addLayer={addLayer}
        removeLayer={removeLayer}
        updateLayer={updateLayer}
        setActiveLayer={setActiveLayer}
        reorderLayers={reorderLayers}
        toggleLayerVisibility={toggleLayerVisibility}
        toggleLayerLock={toggleLayerLock}
        isVisible={isLayerPanelVisible}
        onToggleVisibility={() => setIsLayerPanelVisible(!isLayerPanelVisible)}
      />
    </div>
  )
}

export default App
