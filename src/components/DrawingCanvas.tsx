import { useEffect, useRef, useState } from 'react'
import type { DrawingTool } from '../App'
import './DrawingCanvas.css'

interface DrawingCanvasProps {
  map: google.maps.Map
  isDrawing: boolean
  onDrawingChange: (isDrawing: boolean) => void
  selectedColor: string
  selectedTool: DrawingTool
  lineWidth: number
}

interface Point {
  lat: number
  lng: number
}

interface Shape {
  type: DrawingTool
  points: Point[]
  color: string
  width: number
}

function DrawingCanvas({ 
  map, 
  isDrawing, 
  onDrawingChange,
  selectedColor,
  selectedTool,
  lineWidth
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<google.maps.OverlayView | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [currentPixelLine, setCurrentPixelLine] = useState<{x: number, y: number}[]>([])
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null)
  const shapesRef = useRef<Shape[]>([])

  useEffect(() => {
    shapesRef.current = shapes
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
            ctx.beginPath()
            let firstPoint = true
            shape.points.forEach(point => {
              const latLng = new google.maps.LatLng(point.lat, point.lng)
              const pixel = projection.fromLatLngToContainerPixel(latLng)
              if (pixel) {
                if (firstPoint) {
                  ctx.moveTo(pixel.x, pixel.y)
                  firstPoint = false
                } else {
                  ctx.lineTo(pixel.x, pixel.y)
                }
              }
            })
            ctx.stroke()
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
            ctx.beginPath()
            ctx.moveTo(currentPixelLine[0].x, currentPixelLine[0].y)
            for (let i = 1; i < currentPixelLine.length; i++) {
              ctx.lineTo(currentPixelLine[i].x, currentPixelLine[i].y)
            }
            ctx.stroke()
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
          }
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
  }, [map, currentPixelLine, startPoint, selectedColor, selectedTool, lineWidth])

  const pixelToLatLng = (x: number, y: number): google.maps.LatLng | null => {
    const overlay = overlayRef.current
    if (!overlay) return null

    const projection = overlay.getProjection()
    if (!projection) return null

    const point = new google.maps.Point(x, y)
    return projection.fromContainerPixelToLatLng(point)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    setIsMouseDown(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setStartPoint({x, y})
    setCurrentPixelLine([{x, y}])
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMouseDown) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (selectedTool === 'pen') {
      setCurrentPixelLine(prev => [...prev, {x, y}])
    } else {
      setCurrentPixelLine([startPoint!, {x, y}])
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing || !isMouseDown || !startPoint) return

    setIsMouseDown(false)
    
    if (currentPixelLine.length > 1) {
      const latLngPoints: Point[] = []
      
      if (selectedTool === 'pen') {
        currentPixelLine.forEach(pixel => {
          const latLng = pixelToLatLng(pixel.x, pixel.y)
          if (latLng) {
            latLngPoints.push({
              lat: latLng.lat(),
              lng: latLng.lng()
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
        setShapes(prev => [...prev, {
          type: selectedTool,
          points: latLngPoints,
          color: selectedColor,
          width: lineWidth
        }])
      }
    }
    
    setCurrentPixelLine([])
    setStartPoint(null)
  }

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas ${isDrawing ? 'drawing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  )
}

export default DrawingCanvas