import { useState, useEffect, useCallback, useRef } from 'react'
import { generateDrawingId, saveDrawing, loadDrawing } from '../services/drawingService'
import type { DrawingTool, Shape } from '../types'

const DEFAULT_COLOR = '#ff4757'
const DEFAULT_LINE_WIDTH = 3
/**
 * Auto-save delay in milliseconds.
 * Waits 1 second after user stops drawing before triggering save.
 * This prevents frequent saves during continuous drawing.
 */
const AUTO_SAVE_DELAY = 1000

/**
 * Return type for useDrawing hook.
 * Manages drawing state, tools, and smart auto-save functionality.
 */
export interface UseDrawingReturn {
  drawingId: string
  shapes: Shape[]
  selectedColor: string
  selectedTool: DrawingTool
  lineWidth: number
  isDrawing: boolean
  isSaving: boolean
  hasCurrentDrawing: boolean
  setShapes: (shapes: Shape[]) => void
  setSelectedColor: (color: string) => void
  setSelectedTool: (tool: DrawingTool) => void
  setLineWidth: (width: number) => void
  setIsDrawing: (isDrawing: boolean) => void
  setHasCurrentDrawing: (has: boolean) => void
  handleShare: () => void
  loadDrawingData: (id: string) => Promise<void>
}

/**
 * Custom hook for managing drawing state and smart auto-save functionality.
 *
 * Features:
 * - Delayed auto-save (1 second after drawing stops)
 * - Skips saves during continuous drawing for better performance
 * - Automatic drawing ID generation and URL management
 * - Firebase integration with anonymous authentication
 *
 * @param user - Firebase user object for authentication
 * @param getCurrentMapState - Function to get current map center and zoom
 * @param setCenter - Function to update map center
 * @param setZoom - Function to update map zoom
 */
export const useDrawing = (
  user: any,
  getCurrentMapState: () => { center: { lat: number, lng: number }, zoom: number },
  setCenter: (center: { lat: number, lng: number }) => void,
  setZoom: (zoom: number) => void
): UseDrawingReturn => {
  const [drawingId, setDrawingId] = useState<string>('')
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR)
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('pen')
  const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasCurrentDrawing, setHasCurrentDrawing] = useState(false)
  const [lastShapeCount, setLastShapeCount] = useState(0)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize drawing ID from URL or generate new one
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

  const handleAutoSave = useCallback(async () => {
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
      const currentMapState = getCurrentMapState()
      await saveDrawing(drawingId, shapes, currentMapState.center, currentMapState.zoom)
      console.log('✅ Drawing auto-saved successfully')
    } catch (error) {
      console.error('Failed to auto-save drawing:', error)
    } finally {
      setIsSaving(false)
    }
  }, [user, drawingId, shapes, getCurrentMapState])

  // Auto-save with delay when shapes change (only when not actively drawing)
  useEffect(() => {
    if (shapes.length === 0 || shapes.length <= lastShapeCount) {
      setLastShapeCount(shapes.length)
      return
    }

    if (shapes.length > lastShapeCount) {
      setLastShapeCount(shapes.length)

      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // Skip auto-save if user is actively drawing
      if (isDrawing) {
        console.log('🎨 User is actively drawing, skipping auto-save')
        return
      }

      // Set new timeout for delayed auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Auto-save delay completed, executing save...')
        handleAutoSave()
      }, AUTO_SAVE_DELAY)
    }
  }, [shapes, lastShapeCount, handleAutoSave, isDrawing])

  // Auto-save when drawing mode ends (if there are unsaved changes)
  useEffect(() => {
    if (!isDrawing && shapes.length > 0) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // Trigger delayed auto-save when drawing ends
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('🏁 Drawing ended, executing delayed auto-save...')
        handleAutoSave()
      }, AUTO_SAVE_DELAY)
    }
  }, [isDrawing, shapes.length, handleAutoSave])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const handleShare = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    alert('共有リンクをコピーしました！')
  }, [])

  return {
    drawingId,
    shapes,
    selectedColor,
    selectedTool,
    lineWidth,
    isDrawing,
    isSaving,
    hasCurrentDrawing,
    setShapes,
    setSelectedColor,
    setSelectedTool,
    setLineWidth,
    setIsDrawing,
    setHasCurrentDrawing,
    handleShare,
    loadDrawingData
  }
}
