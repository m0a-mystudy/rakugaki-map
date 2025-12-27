import { useEffect } from 'react'
import type { DrawingTool, LayerV2 } from '../types'
import { useDrawingCanvasV2 } from '../hooks/useDrawingCanvasV2'
import { getVisibleTiles, tileCoordToPixel } from '../services/tileService'
import type { TileCacheManager } from '../hooks/useTileCache'
import './DrawingCanvas.css'

interface DrawingCanvasV2Props {
  map: google.maps.Map
  isDrawing: boolean
  selectedColor: string
  selectedTool: DrawingTool
  lineWidth: number
  layers: LayerV2[]
  activeLayerId: string | null
  baseZoom: number
  tileCache: TileCacheManager
  onDrawingComplete?: () => void
  onCurrentDrawingChange?: (hasCurrentDrawing: boolean) => void
}

const TILE_SIZE_PX = 256

function DrawingCanvasV2({
  map,
  isDrawing,
  selectedColor,
  selectedTool,
  lineWidth,
  layers,
  activeLayerId,
  baseZoom,
  tileCache,
  onDrawingComplete,
  onCurrentDrawingChange
}: DrawingCanvasV2Props) {
  const {
    canvasRef,
    overlayRef,
    isMouseDown,
    currentPixelLine,
    startPoint,
    hoverPoint,
    handlePointerStart,
    handlePointerMove,
    handlePointerEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  } = useDrawingCanvasV2(
    map,
    isDrawing,
    selectedTool,
    selectedColor,
    lineWidth,
    activeLayerId,
    baseZoom,
    tileCache,
    onDrawingComplete,
    onCurrentDrawingChange
  )

  // Set up Google Maps overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return

    class TileDrawingOverlay extends google.maps.OverlayView {
      canvas: HTMLCanvasElement

      constructor(canvas: HTMLCanvasElement) {
        super()
        this.canvas = canvas
      }

      onAdd() {}

      draw() {
        const projection = this.getProjection()
        if (!projection) return

        const ctx = this.canvas.getContext('2d')
        if (!ctx) return

        const mapDiv = map.getDiv()
        this.canvas.width = mapDiv.offsetWidth
        this.canvas.height = mapDiv.offsetHeight

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Get map bounds and zoom
        const bounds = map.getBounds()
        const currentZoom = map.getZoom()
        if (!bounds || currentZoom === undefined) return

        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        const mapBounds = {
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        }
        const mapSize = {
          width: this.canvas.width,
          height: this.canvas.height,
        }

        // Get visible tiles at base zoom level
        const visibleTiles = getVisibleTiles(mapBounds, baseZoom)

        // Get visible layers sorted by order (bottom to top)
        const visibleLayers = layers
          .filter(layer => layer.visible)
          .sort((a, b) => a.order - b.order)

        // Draw tiles for each layer
        visibleLayers.forEach(layer => {
          ctx.save()
          ctx.globalAlpha = layer.opacity

          visibleTiles.forEach(tileCoord => {
            // Check if we have this tile in cache or in layer's tiles
            if (tileCache.hasTile(layer.id, tileCoord)) {
              const tileCanvas = tileCache.getTileCanvas(layer.id, tileCoord)

              // Calculate tile position on screen
              const tilePixel = tileCoordToPixel(tileCoord, mapBounds, mapSize)

              // Calculate tile size on screen based on zoom
              const totalTiles = Math.pow(2, baseZoom)
              const worldWidth = mapSize.width / ((mapBounds.east - mapBounds.west) / 360)
              const tileScreenSize = (worldWidth / totalTiles)

              // Draw the tile
              ctx.drawImage(
                tileCanvas,
                0, 0, TILE_SIZE_PX, TILE_SIZE_PX,
                tilePixel.x, tilePixel.y, tileScreenSize, tileScreenSize
              )
            }
          })

          ctx.restore()
        })

        // Draw current shape being drawn (preview)
        if (startPoint && currentPixelLine.length > 0) {
          ctx.strokeStyle = selectedColor
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          if (selectedTool === 'pen' && currentPixelLine.length > 1) {
            // Draw each segment with its own line width based on pressure
            for (let i = 0; i < currentPixelLine.length - 1; i++) {
              const point = currentPixelLine[i]
              const nextPoint = currentPixelLine[i + 1]

              ctx.beginPath()

              // Apply pressure-based line width
              const pressure = Math.max(0.1, Math.min(1.0, nextPoint.pressure || 0.5))
              const dynamicWidth = lineWidth * (0.3 + pressure * 0.7)
              ctx.lineWidth = dynamicWidth

              ctx.moveTo(point.x, point.y)
              ctx.lineTo(nextPoint.x, nextPoint.y)
              ctx.stroke()
            }
          } else if (selectedTool === 'line') {
            ctx.beginPath()
            ctx.moveTo(startPoint.x, startPoint.y)
            ctx.lineTo(
              currentPixelLine[currentPixelLine.length - 1].x,
              currentPixelLine[currentPixelLine.length - 1].y
            )
            ctx.stroke()
          } else if (selectedTool === 'rectangle') {
            const current = currentPixelLine[currentPixelLine.length - 1]
            ctx.beginPath()
            ctx.rect(
              startPoint.x,
              startPoint.y,
              current.x - startPoint.x,
              current.y - startPoint.y
            )
            ctx.stroke()
          } else if (selectedTool === 'circle') {
            const current = currentPixelLine[currentPixelLine.length - 1]
            const radiusX = Math.abs(current.x - startPoint.x) / 2
            const radiusY = Math.abs(current.y - startPoint.y) / 2
            const centerX = (startPoint.x + current.x) / 2
            const centerY = (startPoint.y + current.y) / 2

            ctx.beginPath()
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
            ctx.stroke()
          } else if (selectedTool === 'eraser' && currentPixelLine.length > 0) {
            // Draw eraser preview circle
            const eraserRadius = lineWidth * 6
            const lastPoint = currentPixelLine[currentPixelLine.length - 1]

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(lastPoint.x, lastPoint.y, eraserRadius, 0, 2 * Math.PI)
            ctx.stroke()

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(lastPoint.x, lastPoint.y, eraserRadius - 1, 0, 2 * Math.PI)
            ctx.stroke()
          }
        }

        // Draw hover cursor for eraser when not drawing
        if (!isMouseDown && selectedTool === 'eraser' && hoverPoint && isDrawing) {
          const eraserRadius = lineWidth * 6

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(hoverPoint.x, hoverPoint.y, eraserRadius, 0, 2 * Math.PI)
          ctx.stroke()

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(hoverPoint.x, hoverPoint.y, eraserRadius - 1, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }

      onRemove() {}
    }

    const overlay = new TileDrawingOverlay(canvas)
    overlay.setMap(map)
    overlayRef.current = overlay

    const updateCanvasSize = () => {
      google.maps.event.trigger(overlay, 'draw')
    }

    window.addEventListener('resize', updateCanvasSize)

    // Listen for map events to redraw
    const boundsListener = map.addListener('bounds_changed', () => {
      google.maps.event.trigger(overlay, 'draw')
    })

    const zoomListener = map.addListener('zoom_changed', () => {
      google.maps.event.trigger(overlay, 'draw')
    })

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      google.maps.event.removeListener(boundsListener)
      google.maps.event.removeListener(zoomListener)
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }
    }
  }, [map, baseZoom, layers, tileCache])

  // Redraw when current drawing changes
  useEffect(() => {
    if (overlayRef.current) {
      google.maps.event.trigger(overlayRef.current, 'draw')
    }
  }, [currentPixelLine, startPoint, hoverPoint, isMouseDown])

  // Redraw when layers change
  useEffect(() => {
    if (overlayRef.current) {
      google.maps.event.trigger(overlayRef.current, 'draw')
    }
  }, [layers])

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas ${isDrawing ? 'drawing' : ''} ${selectedTool === 'eraser' ? 'eraser-cursor' : ''} ${selectedTool === 'pan' ? 'pan-mode' : ''}`}
      onPointerDown={handlePointerStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isDrawing ? 'auto' : 'none',
        touchAction: 'none',
        cursor: isDrawing ? (selectedTool === 'eraser' ? 'none' : 'crosshair') : 'default'
      }}
    />
  )
}

export default DrawingCanvasV2
