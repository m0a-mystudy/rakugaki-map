import { useState, useEffect, useCallback, useRef } from 'react'
import { generateDrawingId, saveDrawingV2, loadDrawingV2 } from '../services/drawingService'
import type { DrawingTool, LayerV2 } from '../types'
import { useTileCache } from './useTileCache'
import { useDrawingHistoryV2 } from './useDrawingHistoryV2'

const DEFAULT_COLOR = '#ff4757'
const DEFAULT_LINE_WIDTH = 3
const AUTO_SAVE_DELAY = 1000
const DEFAULT_ZOOM = 15

function generateLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export interface UseDrawingV2Return {
  drawingId: string
  layers: LayerV2[]
  activeLayerId: string | null
  baseZoom: number
  selectedColor: string
  selectedTool: DrawingTool
  lineWidth: number
  isDrawing: boolean
  isSaving: boolean
  hasCurrentDrawing: boolean
  tileCache: ReturnType<typeof useTileCache>
  setSelectedColor: (color: string) => void
  setSelectedTool: (tool: DrawingTool) => void
  setLineWidth: (width: number) => void
  setIsDrawing: (isDrawing: boolean) => void
  setHasCurrentDrawing: (has: boolean) => void
  handleShare: () => void
  loadDrawingData: (id: string) => Promise<void>
  onDrawingComplete: () => void
  clearAllTiles: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  addLayer: (name?: string) => string
  removeLayer: (layerId: string) => void
  updateLayer: (layerId: string, updates: Partial<Omit<LayerV2, 'id' | 'tiles'>>) => void
  setActiveLayer: (layerId: string) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleLayerLock: (layerId: string) => void
  getVisibleLayers: () => LayerV2[]
  isLayerLocked: (layerId: string) => boolean
  isLayerVisible: (layerId: string) => boolean
}

export const useDrawingV2 = (
  user: any,
  getCurrentMapState: () => { center: { lat: number, lng: number }, zoom: number }
): UseDrawingV2Return => {
  const [drawingId, setDrawingId] = useState<string>('')
  const [layers, setLayers] = useState<LayerV2[]>(() => {
    const defaultLayer: LayerV2 = {
      id: generateLayerId(),
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
      tiles: []
    }
    return [defaultLayer]
  })
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [baseZoom, setBaseZoom] = useState<number>(DEFAULT_ZOOM)
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR)
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('pan')
  const [lineWidth, setLineWidth] = useState(DEFAULT_LINE_WIDTH)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasCurrentDrawing, setHasCurrentDrawing] = useState(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const tileCache = useTileCache()
  const history = useDrawingHistoryV2(tileCache)

  // Set active layer to first layer if not set
  useEffect(() => {
    if (activeLayerId === null && layers.length > 0) {
      setActiveLayerId(layers[0].id)
    }
  }, [layers, activeLayerId])

  // Initialize layer in tile cache
  useEffect(() => {
    layers.forEach(layer => {
      tileCache.initializeLayer(layer.id)
    })
  }, [layers, tileCache])

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

      // Set base zoom from current map state
      const mapState = getCurrentMapState()
      const currentZoom = Math.floor(mapState.zoom)
      console.log('🗺️ Setting baseZoom:', currentZoom, 'from map state:', mapState)
      setBaseZoom(currentZoom)
    }
  }, [])

  const loadDrawingData = async (id: string) => {
    try {
      const data = await loadDrawingV2(id)
      if (data) {
        setLayers(data.layers)
        setBaseZoom(data.baseZoom)
        if (data.activeLayerId) {
          setActiveLayerId(data.activeLayerId)
        }
        history.clear()

        // Load tiles into cache
        for (const layer of data.layers) {
          tileCache.initializeLayer(layer.id)
          for (const tile of layer.tiles) {
            try {
              await tileCache.loadTileFromUrl(layer.id, tile.coord, tile.storageUrl)
            } catch (error) {
              console.error(`Failed to load tile: ${tile.storageUrl}`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load drawing:', error)
    }
  }

  const handleAutoSave = useCallback(async () => {
    console.log('🔄 handleAutoSave called:', { user: !!user, drawingId, userId: user?.uid })

    if (!user || !drawingId) {
      console.log('⚠️ Save skipped: user or drawingId missing', { user: !!user, drawingId })
      return
    }

    const dirtyTiles = tileCache.getDirtyTiles()
    console.log('🔄 Dirty tiles:', dirtyTiles.length)

    if (dirtyTiles.length === 0) {
      console.log('⚠️ Save skipped: no dirty tiles')
      return
    }

    setIsSaving(true)
    try {
      console.log('💾 Starting save...')
      const updatedLayers = await saveDrawingV2(
        drawingId,
        layers,
        activeLayerId,
        baseZoom,
        tileCache
      )
      setLayers(updatedLayers)
      console.log('✅ Save completed successfully')
    } catch (error) {
      console.error('❌ Failed to auto-save drawing:', error)
    } finally {
      setIsSaving(false)
    }
  }, [user, drawingId, layers, activeLayerId, baseZoom, tileCache])

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave()
    }, AUTO_SAVE_DELAY)
  }, [handleAutoSave])

  const onDrawingComplete = useCallback(() => {
    // Drawing completed, schedule auto-save
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // Auto-save when drawing mode ends
  useEffect(() => {
    if (!isDrawing) {
      const dirtyTiles = tileCache.getDirtyTiles()
      if (dirtyTiles.length > 0) {
        scheduleAutoSave()
      }
    }
  }, [isDrawing, scheduleAutoSave, tileCache])

  // Update baseZoom when starting drawing mode if no tiles exist yet
  useEffect(() => {
    if (isDrawing) {
      // Check if there are any existing tiles
      const hasTiles = layers.some(layer => layer.tiles.length > 0)
      if (!hasTiles) {
        const mapState = getCurrentMapState()
        const currentZoom = Math.floor(mapState.zoom)
        if (currentZoom !== baseZoom) {
          console.log('🗺️ Updating baseZoom from', baseZoom, 'to', currentZoom)
          setBaseZoom(currentZoom)
        }
      }
    }
  }, [isDrawing, layers, baseZoom, getCurrentMapState])

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
    alert('Share link copied!')
  }, [])

  const clearAllTiles = useCallback(() => {
    if (activeLayerId) {
      // Save current state for undo
      history.saveSnapshot(activeLayerId)

      // Clear all tiles in active layer
      tileCache.clearLayerTiles(activeLayerId)

      // Schedule auto-save
      scheduleAutoSave()
    }
  }, [activeLayerId, tileCache, history, scheduleAutoSave])

  const undo = useCallback(() => {
    if (history.canUndo()) {
      history.undo()
      scheduleAutoSave()
    }
  }, [history, scheduleAutoSave])

  const redo = useCallback(() => {
    if (history.canRedo()) {
      history.redo()
      scheduleAutoSave()
    }
  }, [history, scheduleAutoSave])

  // Layer management functions
  const addLayer = useCallback((name?: string): string => {
    const newLayerId = generateLayerId()
    const maxOrder = Math.max(...layers.map(l => l.order), -1)
    const layerNumber = layers.length + 1

    const newLayer: LayerV2 = {
      id: newLayerId,
      name: name || `Layer ${layerNumber}`,
      visible: true,
      locked: false,
      opacity: 1,
      order: maxOrder + 1,
      tiles: []
    }

    setLayers(prev => [...prev, newLayer])
    setActiveLayerId(newLayerId)
    tileCache.initializeLayer(newLayerId)
    return newLayerId
  }, [layers, tileCache])

  const removeLayer = useCallback((layerId: string) => {
    if (layers.length <= 1) return

    setLayers(prev => {
      const newLayers = prev.filter(l => l.id !== layerId)
      if (activeLayerId === layerId && newLayers.length > 0) {
        setActiveLayerId(newLayers[0].id)
      }
      return newLayers
    })

    tileCache.removeLayer(layerId)
  }, [layers.length, activeLayerId, tileCache])

  const updateLayer = useCallback((layerId: string, updates: Partial<Omit<LayerV2, 'id' | 'tiles'>>) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    )
  }, [])

  const setActiveLayer = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (layer && !layer.locked) {
      setActiveLayerId(layerId)
    }
  }, [layers])

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setLayers(prev => {
      const newLayers = [...prev]
      const [movedLayer] = newLayers.splice(fromIndex, 1)
      newLayers.splice(toIndex, 0, movedLayer)

      return newLayers.map((layer, index) => ({
        ...layer,
        order: index
      }))
    })
  }, [])

  const toggleLayerVisibility = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (layer) {
      updateLayer(layerId, { visible: !layer.visible })
    }
  }, [layers, updateLayer])

  const toggleLayerLock = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (layer) {
      updateLayer(layerId, { locked: !layer.locked })
      if (!layer.locked && activeLayerId === layerId) {
        const firstUnlockedLayer = layers.find(l => l.id !== layerId && !l.locked)
        if (firstUnlockedLayer) {
          setActiveLayerId(firstUnlockedLayer.id)
        }
      }
    }
  }, [layers, activeLayerId, updateLayer])

  const getVisibleLayers = useCallback(() => {
    return layers.filter(layer => layer.visible).sort((a, b) => a.order - b.order)
  }, [layers])

  const isLayerLocked = useCallback((layerId: string) => {
    return layers.find(l => l.id === layerId)?.locked || false
  }, [layers])

  const isLayerVisible = useCallback((layerId: string) => {
    return layers.find(l => l.id === layerId)?.visible || false
  }, [layers])

  return {
    drawingId,
    layers,
    activeLayerId,
    baseZoom,
    selectedColor,
    selectedTool,
    lineWidth,
    isDrawing,
    isSaving,
    hasCurrentDrawing,
    tileCache,
    setSelectedColor,
    setSelectedTool,
    setLineWidth,
    setIsDrawing,
    setHasCurrentDrawing,
    handleShare,
    loadDrawingData,
    onDrawingComplete,
    clearAllTiles,
    undo,
    redo,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    getVisibleLayers,
    isLayerLocked,
    isLayerVisible
  }
}
