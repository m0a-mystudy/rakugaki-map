import { useRef, useState, useCallback, useEffect } from 'react'
import type { DrawingTool, TileCoord } from '../types'
import { tileCoordToPixel, getAffectedTiles } from '../services/tileService'
import type { TileCacheManager } from './useTileCache'

interface DrawingEventCoords {
  x: number
  y: number
  pressure: number
  pointerId: number | null
  type: 'mouse' | 'pen' | 'touch'
}

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface UseDrawingCanvasV2Return {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  overlayRef: React.MutableRefObject<google.maps.OverlayView | null>
  isMouseDown: boolean
  currentPixelLine: { x: number; y: number; pressure?: number }[]
  startPoint: { x: number; y: number } | null
  activePointerId: number | null
  hoverPoint: { x: number; y: number } | null
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
  cleanupOverlay: () => void
}

const TILE_SIZE_PX = 256

export const useDrawingCanvasV2 = (
  map: google.maps.Map | null,
  isDrawing: boolean,
  selectedTool: DrawingTool,
  selectedColor: string,
  lineWidth: number,
  activeLayerId: string | null,
  tileCache: TileCacheManager,
  onDrawingComplete?: () => void,
  onCurrentDrawingChange?: (hasCurrentDrawing: boolean) => void
): UseDrawingCanvasV2Return => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<google.maps.OverlayView | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [currentPixelLine, setCurrentPixelLine] = useState<{ x: number; y: number; pressure?: number }[]>([])
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [activePointerId, setActivePointerId] = useState<number | null>(null)
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null)

  // Report current drawing state to parent
  useEffect(() => {
    const hasDrawing = currentPixelLine.length > 0
    onCurrentDrawingChange?.(hasDrawing)
  }, [currentPixelLine, onCurrentDrawingChange])

  const getEventCoordinates = useCallback((e: React.MouseEvent | React.PointerEvent | React.TouchEvent): DrawingEventCoords | null => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    let clientX: number, clientY: number, pressure = 0.5, pointerId: number | null = null, type: 'mouse' | 'pen' | 'touch' = 'mouse'

    if ('pointerId' in e) {
      clientX = e.clientX
      clientY = e.clientY
      if (e.pointerType === 'pen') {
        pressure = e.pressure > 0 ? e.pressure : 0.5
      } else {
        pressure = e.pressure || 0.5
      }
      pointerId = e.pointerId
      type = e.pointerType === 'pen' ? 'pen' : e.pointerType === 'touch' ? 'touch' : 'mouse'
    } else if ('clientX' in e) {
      clientX = e.clientX
      clientY = e.clientY
      pressure = 0.5
      type = 'mouse'
    } else if ('touches' in e && e.touches.length > 0) {
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

  /**
   * 現在のマップ状態を取得
   */
  const getMapState = useCallback(() => {
    if (!map) return null

    const bounds = map.getBounds()
    const zoom = map.getZoom()
    const canvas = canvasRef.current

    if (!bounds || zoom === undefined || !canvas) return null

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    return {
      mapBounds: {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      },
      zoom: Math.floor(zoom),
      mapSize: {
        width: canvas.width,
        height: canvas.height,
      }
    }
  }, [map])

  /**
   * ピクセル座標をタイル内のローカル座標に変換
   */
  const pixelToTileLocal = useCallback((
    pixelX: number,
    pixelY: number,
    tileCoord: TileCoord,
    mapBounds: MapBounds,
    mapSize: { width: number; height: number }
  ): { x: number; y: number } => {
    // タイルの左上ピクセル座標を取得
    const tilePixel = tileCoordToPixel(tileCoord, mapBounds, mapSize)

    // タイル内のローカル座標を計算
    // 現在のズームレベルでのタイルのピクセルサイズを計算
    const totalTiles = Math.pow(2, tileCoord.zoom)
    const worldWidth = mapSize.width / ((mapBounds.east - mapBounds.west) / 360)
    const tilePixelSize = worldWidth / totalTiles

    return {
      x: ((pixelX - tilePixel.x) / tilePixelSize) * TILE_SIZE_PX,
      y: ((pixelY - tilePixel.y) / tilePixelSize) * TILE_SIZE_PX,
    }
  }, [])

  /**
   * 線分をタイルCanvasに描画
   */
  const drawLineSegmentToTile = useCallback((
    layerId: string,
    tileCoord: TileCoord,
    points: { x: number; y: number; pressure?: number }[],
    mapBounds: MapBounds,
    mapSize: { width: number; height: number }
  ) => {
    if (points.length < 2) return

    const canvas = tileCache.getTileCanvas(layerId, tileCoord)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = selectedColor
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.beginPath()

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      // ピクセル座標をタイルローカル座標に変換
      const local1 = pixelToTileLocal(p1.x, p1.y, tileCoord, mapBounds, mapSize)
      const local2 = pixelToTileLocal(p2.x, p2.y, tileCoord, mapBounds, mapSize)

      // 筆圧に基づく線幅
      const pressure = p1.pressure ?? 0.5
      const dynamicWidth = lineWidth * (0.3 + pressure * 0.7)
      ctx.lineWidth = dynamicWidth

      ctx.moveTo(local1.x, local1.y)
      ctx.lineTo(local2.x, local2.y)
      ctx.stroke()
      ctx.beginPath()
    }

    // タイルを dirty としてマーク
    tileCache.markTileDirty(layerId, tileCoord)
  }, [selectedColor, selectedTool, lineWidth, tileCache, pixelToTileLocal])

  /**
   * 描画を完了（タイルに確定）
   */
  const finishDrawing = useCallback(() => {
    if (!activeLayerId || currentPixelLine.length < 2) {
      setCurrentPixelLine([])
      setStartPoint(null)
      setIsMouseDown(false)
      setActivePointerId(null)
      return
    }

    const mapState = getMapState()
    if (!mapState) {
      setCurrentPixelLine([])
      setStartPoint(null)
      setIsMouseDown(false)
      setActivePointerId(null)
      return
    }

    const { mapBounds, zoom, mapSize } = mapState

    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      // 影響するタイルを特定
      const affectedTiles = getAffectedTiles(
        currentPixelLine,
        lineWidth,
        zoom,
        mapBounds,
        mapSize
      )

      // 各タイルに描画
      for (const tileCoord of affectedTiles) {
        drawLineSegmentToTile(
          activeLayerId,
          tileCoord,
          currentPixelLine,
          mapBounds,
          mapSize
        )
      }
    } else if (selectedTool === 'line' && startPoint && currentPixelLine.length > 0) {
      const endPoint = currentPixelLine[currentPixelLine.length - 1]
      const linePoints = [startPoint, endPoint]

      const affectedTiles = getAffectedTiles(
        linePoints,
        lineWidth,
        zoom,
        mapBounds,
        mapSize
      )

      for (const tileCoord of affectedTiles) {
        drawLineSegmentToTile(
          activeLayerId,
          tileCoord,
          linePoints,
          mapBounds,
          mapSize
        )
      }
    } else if (selectedTool === 'rectangle' && startPoint && currentPixelLine.length > 0) {
      const endPoint = currentPixelLine[currentPixelLine.length - 1]
      const rectPoints = [
        startPoint,
        { x: endPoint.x, y: startPoint.y },
        endPoint,
        { x: startPoint.x, y: endPoint.y },
        startPoint, // 閉じる
      ]

      const affectedTiles = getAffectedTiles(
        rectPoints,
        lineWidth,
        zoom,
        mapBounds,
        mapSize
      )

      for (const tileCoord of affectedTiles) {
        drawLineSegmentToTile(
          activeLayerId,
          tileCoord,
          rectPoints,
          mapBounds,
          mapSize
        )
      }
    } else if (selectedTool === 'circle' && startPoint && currentPixelLine.length > 0) {
      const endPoint = currentPixelLine[currentPixelLine.length - 1]
      const centerX = (startPoint.x + endPoint.x) / 2
      const centerY = (startPoint.y + endPoint.y) / 2
      const radiusX = Math.abs(endPoint.x - startPoint.x) / 2
      const radiusY = Math.abs(endPoint.y - startPoint.y) / 2

      // 円を近似する点を生成
      const circlePoints: { x: number; y: number }[] = []
      const segments = 64
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        circlePoints.push({
          x: centerX + radiusX * Math.cos(angle),
          y: centerY + radiusY * Math.sin(angle),
        })
      }

      const affectedTiles = getAffectedTiles(
        circlePoints,
        lineWidth,
        zoom,
        mapBounds,
        mapSize
      )

      for (const tileCoord of affectedTiles) {
        drawLineSegmentToTile(
          activeLayerId,
          tileCoord,
          circlePoints,
          mapBounds,
          mapSize
        )
      }
    }

    // 状態をリセット
    setCurrentPixelLine([])
    setStartPoint(null)
    setIsMouseDown(false)
    setActivePointerId(null)

    // 描画完了を通知
    onDrawingComplete?.()
  }, [
    activeLayerId,
    currentPixelLine,
    startPoint,
    selectedTool,
    lineWidth,
    getMapState,
    drawLineSegmentToTile,
    onDrawingComplete
  ])

  // Event handlers
  const handlePointerStart = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeLayerId) return

    if (selectedTool === 'pan') return

    if (activePointerId !== null && e.pointerType !== 'pen') return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setActivePointerId(coords.pointerId)
    setIsMouseDown(true)
    setStartPoint({ x: coords.x, y: coords.y })
    setCurrentPixelLine([coords])

    e.currentTarget.setPointerCapture(e.pointerId)
  }, [isDrawing, activeLayerId, activePointerId, selectedTool, getEventCoordinates])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    if (selectedTool === 'pan') return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

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
    finishDrawing()
  }, [isDrawing, activePointerId, finishDrawing])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null || !activeLayerId) return

    if (selectedTool === 'pan') return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setIsMouseDown(true)
    setStartPoint({ x: coords.x, y: coords.y })
    setCurrentPixelLine([coords])
  }, [isDrawing, activePointerId, activeLayerId, selectedTool, getEventCoordinates])

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
    finishDrawing()
  }, [isDrawing, activePointerId, finishDrawing])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activePointerId !== null || !activeLayerId) return

    e.preventDefault()
    const coords = getEventCoordinates(e)
    if (!coords) return

    setIsMouseDown(true)
    setStartPoint({ x: coords.x, y: coords.y })
    setCurrentPixelLine([coords])
  }, [isDrawing, activePointerId, activeLayerId, getEventCoordinates])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const coords = getEventCoordinates(e)
    if (!coords) return

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
    finishDrawing()
  }, [isDrawing, activePointerId, finishDrawing])

  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null)
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
    cleanupOverlay
  }
}
