import { useEffect, useRef, useState } from 'react'
import type { DrawingTool, Shape } from '../types'
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
  onCurrentDrawingChange
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<google.maps.OverlayView | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [currentPixelLine, setCurrentPixelLine] = useState<{x: number, y: number, pressure?: number}[]>([])
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null)
  const [activePointerId, setActivePointerId] = useState<number | null>(null)
  const [hoverPoint, setHoverPoint] = useState<{x: number, y: number} | null>(null)
  const shapesRef = useRef<Shape[]>([])

  useEffect(() => {
    shapesRef.current = shapes
  }, [shapes])

  // 現在描画中の状態を親に報告
  useEffect(() => {
    const hasDrawing = currentPixelLine.length > 0
    onCurrentDrawingChange?.(hasDrawing)
  }, [currentPixelLine, onCurrentDrawingChange])

  // shapesがクリアされたときに現在の描画線もクリア
  useEffect(() => {
    if (shapes.length === 0) {
      setCurrentPixelLine([])
      setStartPoint(null)
      setIsMouseDown(false)
      setActivePointerId(null)
    }
  }, [shapes.length])

  // shapesが変更されたときに即座にcanvasを再描画
  useEffect(() => {
    if (overlayRef.current) {
      // Google Maps overlayの再描画を強制実行
      google.maps.event.trigger(overlayRef.current, 'draw')
    }
  }, [shapes])

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

        shapesRef.current.forEach(shape => {
          ctx.strokeStyle = shape.color
          ctx.lineWidth = shape.width
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
                  ctx.lineWidth = dynamicWidth
                } else {
                  ctx.lineWidth = shape.width
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
          } else if (shape.type === 'rectangle' && shape.points.length === 2) {
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

        // 現在描画中の図形
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
  }, [map, currentPixelLine, startPoint, selectedColor, selectedTool, lineWidth, isMouseDown, hoverPoint, isDrawing])

  const pixelToLatLng = (x: number, y: number): google.maps.LatLng | null => {
    const overlay = overlayRef.current
    if (!overlay) return null

    const projection = overlay.getProjection()
    if (!projection) return null

    const point = new google.maps.Point(x, y)
    return projection.fromContainerPixelToLatLng(point)
  }

  const getEventCoordinates = (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    let clientX: number, clientY: number, pressure = 0.5, pointerId: number | null = null, type: 'mouse' | 'pen' | 'touch' = 'mouse'

    if ('pointerId' in e) {
      // PointerEvent - iPad Pencil support
      clientX = e.clientX
      clientY = e.clientY
      // iPad Pencil provides pressure values, ensure we use them properly
      if (e.pointerType === 'pen') {
        pressure = e.pressure > 0 ? e.pressure : 0.5
      } else {
        pressure = e.pressure || 0.5
      }
      pointerId = e.pointerId
      type = e.pointerType === 'pen' ? 'pen' : e.pointerType === 'touch' ? 'touch' : 'mouse'
    } else if ('clientX' in e) {
      // MouseEvent
      clientX = e.clientX
      clientY = e.clientY
      pressure = 0.5
      type = 'mouse'
    } else if ('touches' in e && e.touches.length > 0) {
      // TouchEvent
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
      if ('force' in e.touches[0]) {
        pressure = (e.touches[0] as any).force || 0.5
      }
      type = 'touch'
    } else {
      return null
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pressure,
      pointerId,
      type
    }
  }

  const handlePointerStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    // Prioritize pen input over touch
    if (activePointerId !== null && e.pointerType !== 'pen') {
      return // Another pointer is already active
    }

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setActivePointerId(coords.pointerId)
    setIsMouseDown(true)
    setStartPoint({x: coords.x, y: coords.y})
    setCurrentPixelLine([coords])

    // Capture pointer to ensure we get all events
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null) return // Don't handle if pointer is active

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setIsMouseDown(true)
    setStartPoint({x: coords.x, y: coords.y})
    setCurrentPixelLine([coords])
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null) return // Don't handle if pointer is active

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setIsMouseDown(true)
    setStartPoint({x: coords.x, y: coords.y})
    setCurrentPixelLine([coords])
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    // Update hover point for eraser cursor
    if (selectedTool === 'eraser' && !isMouseDown) {
      setHoverPoint({x: coords.x, y: coords.y})
    }

    if (!isMouseDown || activePointerId !== e.pointerId) return

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPixelLine(prev => [...prev, coords])
    } else {
      setCurrentPixelLine([startPoint!, coords])
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMouseDown || activePointerId !== null) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPixelLine(prev => [...prev, coords])
    } else {
      setCurrentPixelLine([startPoint!, coords])
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    // Update hover point for eraser cursor
    if (selectedTool === 'eraser' && !isMouseDown) {
      setHoverPoint({x: coords.x, y: coords.y})
    }

    if (!isMouseDown || activePointerId !== null) return

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPixelLine(prev => [...prev, coords])
    } else {
      setCurrentPixelLine([startPoint!, coords])
    }
  }

  const handleEnd = () => {
    if (!isDrawing || !isMouseDown || !startPoint) return

    setIsMouseDown(false)
    setActivePointerId(null)

    if (selectedTool === 'eraser' && currentPixelLine.length > 0) {
      // Eraser logic: handle partial erasing for pen strokes
      const eraserRadius = lineWidth * 6
      const overlay = overlayRef.current
      if (!overlay) return
      const projection = overlay.getProjection()
      if (!projection) return

      const updatedShapes: Shape[] = []

      shapes.forEach(shape => {
        if (shape.type === 'pen' && shape.points.length > 1) {
          // For pen strokes, implement partial erasing
          const segments: { lat: number; lng: number; pressure?: number }[][] = []
          let currentSegment: { lat: number; lng: number; pressure?: number }[] = []

          for (let i = 0; i < shape.points.length; i++) {
            const point = shape.points[i]
            const latLng = new google.maps.LatLng(point.lat, point.lng)
            const pixel = projection.fromLatLngToContainerPixel(latLng)

            if (pixel) {
              let isErased = false

              // Check if this point intersects with any eraser point
              for (const eraserPoint of currentPixelLine) {
                const distance = Math.sqrt(
                  Math.pow(pixel.x - eraserPoint.x, 2) + Math.pow(pixel.y - eraserPoint.y, 2)
                )
                if (distance <= eraserRadius) {
                  isErased = true
                  break
                }
              }

              if (!isErased) {
                currentSegment.push(point)
              } else {
                // Point is erased, save current segment if it has points
                if (currentSegment.length > 1) {
                  segments.push(currentSegment)
                }
                currentSegment = []
              }
            }
          }

          // Don't forget the last segment
          if (currentSegment.length > 1) {
            segments.push(currentSegment)
          }

          // Create new shapes from segments
          segments.forEach(segment => {
            updatedShapes.push({
              type: 'pen',
              points: segment,
              color: shape.color,
              width: shape.width
            })
          })
        } else {
          // For other shapes (rectangle, circle, line), check for intersection
          let shouldKeep = true

          for (const eraserPoint of currentPixelLine) {
            for (const shapePoint of shape.points) {
              const latLng = new google.maps.LatLng(shapePoint.lat, shapePoint.lng)
              const pixel = projection.fromLatLngToContainerPixel(latLng)
              if (pixel) {
                const distance = Math.sqrt(
                  Math.pow(pixel.x - eraserPoint.x, 2) + Math.pow(pixel.y - eraserPoint.y, 2)
                )
                if (distance <= eraserRadius) {
                  shouldKeep = false
                  break
                }
              }
            }
            if (!shouldKeep) break
          }

          if (shouldKeep) {
            updatedShapes.push(shape)
          }
        }
      })

      onShapesChange(updatedShapes)
    } else if (currentPixelLine.length > 1) {
      const latLngPoints: { lat: number; lng: number; pressure?: number }[] = []

      if (selectedTool === 'pen') {
        currentPixelLine.forEach(pixel => {
          const latLng = pixelToLatLng(pixel.x, pixel.y)
          if (latLng) {
            latLngPoints.push({
              lat: latLng.lat(),
              lng: latLng.lng(),
              pressure: pixel.pressure
            })
          }
        })
      } else {
        const startLatLng = pixelToLatLng(startPoint.x, startPoint.y)
        const endPixel = currentPixelLine[currentPixelLine.length - 1]
        const endLatLng = pixelToLatLng(endPixel.x, endPixel.y)

        if (startLatLng && endLatLng) {
          latLngPoints.push({
            lat: startLatLng.lat(),
            lng: startLatLng.lng()
          }, {
            lat: endLatLng.lat(),
            lng: endLatLng.lng()
          })
        }
      }

      if (latLngPoints.length > 1) {
        const newShape: Shape = {
          type: selectedTool,
          points: latLngPoints,
          color: selectedColor,
          width: lineWidth
        }
        onShapesChange([...shapes, newShape])
      }
    }

    setCurrentPixelLine([])
    setStartPoint(null)
  }

  const handlePointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerId !== e.pointerId) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    handleEnd()
  }

  const handleTouchEnd = () => {
    if (activePointerId !== null) return // Don't handle if pointer is active
    handleEnd()
  }

  const handleMouseUp = () => {
    if (activePointerId !== null) return // Don't handle if pointer is active
    handleEnd()
  }

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas ${isDrawing ? 'drawing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp()
        setHoverPoint(null)
      }}
      onPointerDown={handlePointerStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={(e) => {
        handlePointerEnd(e)
        setHoverPoint(null)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    />
  )
}

export default DrawingCanvas
