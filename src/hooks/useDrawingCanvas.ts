import { useRef, useState, useCallback, useEffect } from 'react'
import type { DrawingTool, Shape, Point } from '../types'
import { MAP_CONSTANTS } from '../constants/map'
import { pixelToLatLng, latLngToPixel, calculateDistance, generateCirclePoints, generateRectanglePoints } from '../utils/coordinateUtils'

interface DrawingEventCoords {
  x: number
  y: number
  pressure: number
  pointerId: number | null
  type: 'mouse' | 'pen' | 'touch'
}

export interface UseDrawingCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  overlayRef: React.MutableRefObject<google.maps.OverlayView | null>
  isMouseDown: boolean
  currentPixelLine: { x: number; y: number; pressure?: number }[]
  startPoint: { x: number; y: number } | null
  activePointerId: number | null
  hoverPoint: { x: number; y: number } | null
  shapesRef: React.MutableRefObject<Shape[]>
  handlePointerStart: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handlePointerEnd: (e: React.PointerEvent<HTMLCanvasElement>) => void
  handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void
  handleTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void
  handleTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseLeave: () => void
  initializeOverlay: (map: google.maps.Map, canvas: HTMLCanvasElement) => void
  cleanupOverlay: () => void
}

export const useDrawingCanvas = (
  map: google.maps.Map | null,
  isDrawing: boolean,
  selectedTool: DrawingTool,
  selectedColor: string,
  lineWidth: number,
  shapes: Shape[],
  onShapesChange: (shapes: Shape[]) => void,
  onCurrentDrawingChange?: (hasCurrentDrawing: boolean) => void
): UseDrawingCanvasReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<google.maps.OverlayView | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [currentPixelLine, setCurrentPixelLine] = useState<{ x: number; y: number; pressure?: number }[]>([])
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [activePointerId, setActivePointerId] = useState<number | null>(null)
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null)
  const shapesRef = useRef<Shape[]>([])

  useEffect(() => {
    shapesRef.current = shapes
  }, [shapes])

  // Report current drawing state to parent
  useEffect(() => {
    const hasDrawing = currentPixelLine.length > 0
    onCurrentDrawingChange?.(hasDrawing)
  }, [currentPixelLine, onCurrentDrawingChange])

  // Clear current drawing line when shapes are cleared
  useEffect(() => {
    if (shapes.length === 0) {
      setCurrentPixelLine([])
      setStartPoint(null)
      setIsMouseDown(false)
      setActivePointerId(null)
    }
  }, [shapes.length])

  const getEventCoordinates = useCallback((e: React.MouseEvent | React.PointerEvent | React.TouchEvent): DrawingEventCoords | null => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    let clientX: number, clientY: number, pressure = 0.5, pointerId: number | null = null, type: 'mouse' | 'pen' | 'touch' = 'mouse'

    if ('pointerId' in e) {
      // PointerEvent - iPad Pencil support
      clientX = e.clientX
      clientY = e.clientY
      // iPad Pencil provides pressure values
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
  }, [])

  const finishShape = useCallback(() => {
    if (!overlayRef.current || !startPoint || currentPixelLine.length === 0 || !map) return

    const projection = overlayRef.current.getProjection()
    if (!projection) return

    const currentZoom = map.getZoom()
    let latLngPoints: Point[] = []

    if (selectedTool === 'pen') {
      latLngPoints = currentPixelLine.map(point => {
        const latLng = pixelToLatLng(point.x, point.y, projection)
        return latLng ? {
          lat: latLng.lat(),
          lng: latLng.lng(),
          pressure: point.pressure
        } : { lat: 0, lng: 0 }
      }).filter(point => point.lat !== 0 || point.lng !== 0)
    } else if (selectedTool === 'line' && currentPixelLine.length > 0) {
      const startLatLng = pixelToLatLng(startPoint.x, startPoint.y, projection)
      const endLatLng = pixelToLatLng(
        currentPixelLine[currentPixelLine.length - 1].x,
        currentPixelLine[currentPixelLine.length - 1].y,
        projection
      )
      if (startLatLng && endLatLng) {
        latLngPoints = [
          { lat: startLatLng.lat(), lng: startLatLng.lng() },
          { lat: endLatLng.lat(), lng: endLatLng.lng() }
        ]
      }
    } else if ((selectedTool === 'rectangle' || selectedTool === 'circle') && currentPixelLine.length > 0) {
      const startLatLng = pixelToLatLng(startPoint.x, startPoint.y, projection)
      const endLatLng = pixelToLatLng(
        currentPixelLine[currentPixelLine.length - 1].x,
        currentPixelLine[currentPixelLine.length - 1].y,
        projection
      )

      if (startLatLng && endLatLng) {
        const topLeft = { lat: startLatLng.lat(), lng: startLatLng.lng() }
        const bottomRight = { lat: endLatLng.lat(), lng: endLatLng.lng() }

        if (selectedTool === 'rectangle') {
          latLngPoints = generateRectanglePoints(topLeft, bottomRight)
        } else {
          // Circle
          const center = topLeft
          const radius = calculateDistance(topLeft, bottomRight)
          latLngPoints = generateCirclePoints(center, radius, MAP_CONSTANTS.CIRCLE_SEGMENTS)
        }
      }
    } else if (selectedTool === 'eraser') {
      const eraserRadius = lineWidth * 6
      const pixelRadius = eraserRadius
      const centerLatLng = pixelToLatLng(
        currentPixelLine[currentPixelLine.length - 1].x,
        currentPixelLine[currentPixelLine.length - 1].y,
        projection
      )

      if (centerLatLng) {
        const updatedShapes = shapesRef.current.filter(shape => {
          return !shape.points.some(point => {
            const pointPixel = latLngToPixel(point.lat, point.lng, projection)
            if (!pointPixel) return false

            const erasePixel = currentPixelLine[currentPixelLine.length - 1]
            const distance = Math.sqrt(
              Math.pow(pointPixel.x - erasePixel.x, 2) +
              Math.pow(pointPixel.y - erasePixel.y, 2)
            )
            return distance <= pixelRadius
          })
        })
        onShapesChange(updatedShapes)
      }
    }

    if (latLngPoints.length > 0 && selectedTool !== 'eraser') {
      const newShape: Shape = {
        type: selectedTool,
        points: latLngPoints,
        color: selectedColor,
        width: lineWidth,
        baseZoom: currentZoom
      }
      onShapesChange([...shapesRef.current, newShape])
    }

    setCurrentPixelLine([])
    setStartPoint(null)
    setIsMouseDown(false)
    setActivePointerId(null)
  }, [map, selectedTool, selectedColor, lineWidth, currentPixelLine, startPoint, onShapesChange])

  // Event handlers
  const handlePointerStart = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    // Prioritize pen input over touch
    if (activePointerId !== null && e.pointerType !== 'pen') {
      return
    }

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setActivePointerId(coords.pointerId)
    setIsMouseDown(true)
    setStartPoint({ x: coords.x, y: coords.y })
    setCurrentPixelLine([coords])

    // Capture pointer to ensure we get all events
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [isDrawing, activePointerId, getEventCoordinates])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    // Update hover point for eraser cursor
    if (selectedTool === 'eraser' && !isMouseDown) {
      setHoverPoint({ x: coords.x, y: coords.y })
    }

    if (!isMouseDown || activePointerId !== e.pointerId) return

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPixelLine(prev => [...prev, coords])
    } else {
      setCurrentPixelLine([coords])
    }
  }, [isDrawing, isMouseDown, activePointerId, selectedTool, getEventCoordinates])

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== e.pointerId) return

    e.preventDefault()
    e.currentTarget.releasePointerCapture(e.pointerId)
    finishShape()
  }, [isDrawing, activePointerId, finishShape])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setIsMouseDown(true)
    setStartPoint({ x: coords.x, y: coords.y })
    setCurrentPixelLine([coords])
  }, [isDrawing, activePointerId, getEventCoordinates])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMouseDown || activePointerId !== null) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPixelLine(prev => [...prev, coords])
    } else {
      setCurrentPixelLine([coords])
    }
  }, [isDrawing, isMouseDown, activePointerId, selectedTool, getEventCoordinates])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null) return

    e.preventDefault()
    finishShape()
  }, [isDrawing, activePointerId, finishShape])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setIsMouseDown(true)
    setStartPoint({ x: coords.x, y: coords.y })
    setCurrentPixelLine([coords])
  }, [isDrawing, activePointerId, getEventCoordinates])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const coords = getEventCoordinates(e)
    if (!coords) return

    // Update hover point for eraser cursor
    if (selectedTool === 'eraser') {
      setHoverPoint({ x: coords.x, y: coords.y })
    }

    if (!isMouseDown || activePointerId !== null) return

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      setCurrentPixelLine(prev => [...prev, coords])
    } else {
      setCurrentPixelLine([coords])
    }
  }, [isDrawing, isMouseDown, activePointerId, selectedTool, getEventCoordinates])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null) return

    e.preventDefault()
    finishShape()
  }, [isDrawing, activePointerId, finishShape])

  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null)
  }, [])

  const initializeOverlay = useCallback(() => {
    // This will be called from the component to set up the overlay
    // The actual overlay creation logic will remain in the component
  }, [])

  const cleanupOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.setMap(null)
      overlayRef.current = null
    }
  }, [])

  return {
    canvasRef,
    overlayRef,
    isMouseDown,
    currentPixelLine,
    startPoint,
    activePointerId,
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
    handleMouseLeave,
    initializeOverlay,
    cleanupOverlay
  }
}
