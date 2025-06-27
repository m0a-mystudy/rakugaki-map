import { useEffect, useRef, useState } from 'react'
import './DrawingCanvas.css'

interface DrawingCanvasProps {
  map: google.maps.Map
  isDrawing: boolean
  onDrawingChange: (isDrawing: boolean) => void
}

interface Point {
  x: number
  y: number
  lat: number
  lng: number
}

interface Line {
  points: Point[]
  color: string
  width: number
}

function DrawingCanvas({ map, isDrawing, onDrawingChange }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<google.maps.OverlayView | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [currentLine, setCurrentLine] = useState<Point[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const overlay = new google.maps.OverlayView()
    overlay.onAdd = function() {}
    overlay.draw = function() {}
    overlay.setMap(map)
    overlayRef.current = overlay

    const updateCanvasSize = () => {
      const mapDiv = map.getDiv()
      canvas.width = mapDiv.offsetWidth
      canvas.height = mapDiv.offsetHeight
      redrawCanvas()
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    const listeners = [
      google.maps.event.addListener(map, 'bounds_changed', redrawCanvas),
      google.maps.event.addListener(map, 'zoom_changed', redrawCanvas),
      google.maps.event.addListener(map, 'center_changed', redrawCanvas),
      google.maps.event.addListener(map, 'projection_changed', redrawCanvas)
    ]

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      listeners.forEach(listener => google.maps.event.removeListener(listener))
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }
    }
  }, [map])

  const latLngToPixel = (lat: number, lng: number): { x: number; y: number } | null => {
    const overlay = overlayRef.current
    if (!overlay) return null

    const projection = overlay.getProjection()
    if (!projection) return null

    const latLng = new google.maps.LatLng(lat, lng)
    const pixel = projection.fromLatLngToContainerPixel(latLng)
    
    if (!pixel) return null

    return {
      x: pixel.x,
      y: pixel.y
    }
  }

  const pixelToLatLng = (x: number, y: number): google.maps.LatLng | null => {
    const overlay = overlayRef.current
    if (!overlay) return null

    const projection = overlay.getProjection()
    if (!projection) return null

    const point = new google.maps.Point(x, y)
    return projection.fromContainerPixelToLatLng(point)
  }

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    lines.forEach(line => {
      if (line.points.length < 2) return
      
      ctx.beginPath()
      ctx.strokeStyle = line.color
      ctx.lineWidth = line.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      let firstPoint = true
      line.points.forEach(point => {
        const pixel = latLngToPixel(point.lat, point.lng)
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
    })

    if (currentLine.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#ff4757'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.moveTo(currentLine[0].x, currentLine[0].y)
      for (let i = 1; i < currentLine.length; i++) {
        ctx.lineTo(currentLine[i].x, currentLine[i].y)
      }
      ctx.stroke()
    }
  }

  useEffect(() => {
    redrawCanvas()
  }, [lines, currentLine])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    setIsMouseDown(true)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const latLng = pixelToLatLng(x, y)
    
    if (latLng) {
      const point = {
        x,
        y,
        lat: latLng.lat(),
        lng: latLng.lng()
      }
      setCurrentLine([point])
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMouseDown) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const latLng = pixelToLatLng(x, y)
    
    if (latLng) {
      const point = {
        x,
        y,
        lat: latLng.lat(),
        lng: latLng.lng()
      }
      setCurrentLine(prev => [...prev, point])
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing || !isMouseDown) return

    setIsMouseDown(false)
    if (currentLine.length > 1) {
      setLines(prev => [...prev, {
        points: currentLine,
        color: '#ff4757',
        width: 3
      }])
    }
    setCurrentLine([])
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