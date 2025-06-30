import { useEffect } from 'react'
import type { DrawingTool, Shape } from '../types'
import { useDrawingCanvas } from '../hooks/useDrawingCanvas'
import './DrawingCanvas.css'

interface DrawingCanvasProps {
  map: google.maps.Map
  isDrawing: boolean
  onDrawingChange?: (isDrawing: boolean) => void
  selectedColor: string
  selectedTool: DrawingTool
  lineWidth: number
  shapes: Shape[]
  onShapesChange: (shapes: Shape[]) => void
  onAddShape?: (shape: Shape) => void
  onCurrentDrawingChange?: (hasCurrentDrawing: boolean) => void
}

function DrawingCanvas({
  map,
  isDrawing,
  selectedColor,
  selectedTool,
  lineWidth,
  shapes,
  onShapesChange,
  onAddShape,
  onCurrentDrawingChange
}: DrawingCanvasProps) {
  const {
    canvasRef,
    overlayRef,
    isMouseDown,
    currentPixelLine,
    startPoint,
    hoverPoint,
    shapesRef,
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
  } = useDrawingCanvas(
    map,
    isDrawing,
    selectedTool,
    selectedColor,
    lineWidth,
    shapes,
    onShapesChange,
    onAddShape,
    onCurrentDrawingChange
  )

  // TIMESTAMP: Force refresh test
  console.log('🚨 DrawingCanvas loaded at:', new Date().toISOString())
  // Note: Canvas redraw is now handled in useDrawingCanvas hook
  // This avoids duplicate redraw triggers

  // Additional effect to ensure canvas redraws when shapes change
  useEffect(() => {
    if (overlayRef.current && shapes.length >= 0) {
      console.log('🖌️ DrawingCanvas: Triggering redraw for shapes change')
      // Force immediate redraw
      requestAnimationFrame(() => {
        if (overlayRef.current) {
          google.maps.event.trigger(overlayRef.current, 'draw')
        }
      })
    }
  }, [shapes])

  // Set up Google Maps overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return

    class DrawingOverlay extends google.maps.OverlayView {
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

        // Draw existing shapes
        shapesRef.current.forEach(shape => {
          ctx.strokeStyle = shape.color

          // Apply zoom-based line width scaling
          if (shape.baseZoom !== undefined && map) {
            const currentZoom = map.getZoom()
            if (currentZoom !== undefined) {
              const zoomScale = Math.pow(2, currentZoom - shape.baseZoom)
              ctx.lineWidth = shape.width * zoomScale
            } else {
              ctx.lineWidth = shape.width
            }
          } else {
            ctx.lineWidth = shape.width
          }

          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.fillStyle = shape.color

          if (shape.type === 'pen' && shape.points.length > 1) {
            // Draw each segment with its own line width based on pressure
            for (let i = 0; i < shape.points.length - 1; i++) {
              const point = shape.points[i]
              const nextPoint = shape.points[i + 1]

              const latLng = new google.maps.LatLng(point.lat, point.lng)
              const nextLatLng = new google.maps.LatLng(nextPoint.lat, nextPoint.lng)
              const pixel = projection.fromLatLngToContainerPixel(latLng)
              const nextPixel = projection.fromLatLngToContainerPixel(nextLatLng)

              if (pixel && nextPixel) {
                ctx.beginPath()

                // Apply pressure-based line width
                if (nextPoint.pressure !== undefined) {
                  const pressure = Math.max(0.1, Math.min(1.0, nextPoint.pressure))
                  const dynamicWidth = shape.width * (0.3 + pressure * 0.7)
                  // Apply zoom scaling for pen strokes too
                  if (shape.baseZoom !== undefined && map) {
                    const currentZoom = map.getZoom()
                    if (currentZoom !== undefined) {
                      const zoomScale = Math.pow(2, currentZoom - shape.baseZoom)
                      ctx.lineWidth = dynamicWidth * zoomScale
                    } else {
                      ctx.lineWidth = dynamicWidth
                    }
                  } else {
                    ctx.lineWidth = dynamicWidth
                  }
                } else {
                  // Apply zoom scaling
                  if (shape.baseZoom !== undefined && map) {
                    const currentZoom = map.getZoom()
                    if (currentZoom !== undefined) {
                      const zoomScale = Math.pow(2, currentZoom - shape.baseZoom)
                      ctx.lineWidth = shape.width * zoomScale
                    } else {
                      ctx.lineWidth = shape.width
                    }
                  } else {
                    ctx.lineWidth = shape.width
                  }
                }

                ctx.moveTo(pixel.x, pixel.y)
                ctx.lineTo(nextPixel.x, nextPixel.y)
                ctx.stroke()
              }
            }
          } else if (shape.type === 'line' && shape.points.length === 2) {
            ctx.beginPath()
            const startLatLng = new google.maps.LatLng(shape.points[0].lat, shape.points[0].lng)
            const endLatLng = new google.maps.LatLng(shape.points[1].lat, shape.points[1].lng)
            const startPixel = projection.fromLatLngToContainerPixel(startLatLng)
            const endPixel = projection.fromLatLngToContainerPixel(endLatLng)
            if (startPixel && endPixel) {
              ctx.moveTo(startPixel.x, startPixel.y)
              ctx.lineTo(endPixel.x, endPixel.y)
              ctx.stroke()
            }
          } else if ((shape.type === 'rectangle' || shape.type === 'circle') && shape.points.length > 2) {
            // New polygon-based rendering for rectangles and circles
            ctx.beginPath()
            let firstX = 0
            let firstY = 0
            let hasFirstPoint = false

            shape.points.forEach((point, index) => {
              const latLng = new google.maps.LatLng(point.lat, point.lng)
              const pixel = projection.fromLatLngToContainerPixel(latLng)

              if (pixel) {
                if (index === 0) {
                  ctx.moveTo(pixel.x, pixel.y)
                  firstX = pixel.x
                  firstY = pixel.y
                  hasFirstPoint = true
                } else {
                  ctx.lineTo(pixel.x, pixel.y)
                }
              }
            })

            // Close the path
            if (hasFirstPoint) {
              ctx.lineTo(firstX, firstY)
            }
            ctx.stroke()
          } else if (shape.type === 'rectangle' && shape.points.length === 2) {
            // Legacy rectangle rendering for backward compatibility
            const topLeftLatLng = new google.maps.LatLng(shape.points[0].lat, shape.points[0].lng)
            const bottomRightLatLng = new google.maps.LatLng(shape.points[1].lat, shape.points[1].lng)
            const topLeft = projection.fromLatLngToContainerPixel(topLeftLatLng)
            const bottomRight = projection.fromLatLngToContainerPixel(bottomRightLatLng)
            if (topLeft && bottomRight) {
              ctx.beginPath()
              ctx.rect(
                topLeft.x,
                topLeft.y,
                bottomRight.x - topLeft.x,
                bottomRight.y - topLeft.y
              )
              ctx.stroke()
            }
          } else if (shape.type === 'circle' && shape.points.length === 2) {
            // Legacy circle rendering for backward compatibility
            const centerLatLng = new google.maps.LatLng(shape.points[0].lat, shape.points[0].lng)
            const edgeLatLng = new google.maps.LatLng(shape.points[1].lat, shape.points[1].lng)
            const center = projection.fromLatLngToContainerPixel(centerLatLng)
            const edge = projection.fromLatLngToContainerPixel(edgeLatLng)
            if (center && edge) {
              const radius = Math.sqrt(
                Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
              )
              ctx.beginPath()
              ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
              ctx.stroke()
            }
          }
        })

        // Draw current shape being drawn
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
            ctx.lineTo(currentPixelLine[currentPixelLine.length - 1].x, currentPixelLine[currentPixelLine.length - 1].y)
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
            const radius = Math.sqrt(
              Math.pow(current.x - startPoint.x, 2) + Math.pow(current.y - startPoint.y, 2)
            )
            ctx.beginPath()
            ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
            ctx.stroke()
          } else if (selectedTool === 'eraser' && currentPixelLine.length > 0) {
            // Draw eraser preview circle
            const eraserRadius = lineWidth * 6
            const lastPoint = currentPixelLine[currentPixelLine.length - 1]

            // Draw circle outline
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(lastPoint.x, lastPoint.y, eraserRadius, 0, 2 * Math.PI)
            ctx.stroke()

            // Draw inner circle
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

          // Draw circle outline
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(hoverPoint.x, hoverPoint.y, eraserRadius, 0, 2 * Math.PI)
          ctx.stroke()

          // Draw inner circle
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(hoverPoint.x, hoverPoint.y, eraserRadius - 1, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }

      onRemove() {}
    }

    const overlay = new DrawingOverlay(canvas)
    overlay.setMap(map)
    overlayRef.current = overlay

    const updateCanvasSize = () => {
      google.maps.event.trigger(overlay, 'draw')
    }

    window.addEventListener('resize', updateCanvasSize)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }
    }
  }, [map, currentPixelLine, startPoint, selectedColor, selectedTool, lineWidth, isMouseDown, hoverPoint, isDrawing, shapesRef, overlayRef])

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas ${isDrawing ? 'drawing' : ''} ${selectedTool === 'eraser' ? 'eraser-cursor' : ''}`}
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

export default DrawingCanvas
