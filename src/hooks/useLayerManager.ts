import { useState, useCallback } from 'react'
import { Layer } from '../types'

export interface UseLayerManagerReturn {
  layers: Layer[]
  activeLayerId: string | null
  addLayer: (name?: string) => string
  removeLayer: (layerId: string) => void
  updateLayer: (layerId: string, updates: Partial<Omit<Layer, 'id'>>) => void
  setActiveLayer: (layerId: string) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleLayerLock: (layerId: string) => void
  getVisibleLayers: () => Layer[]
  isLayerLocked: (layerId: string) => boolean
  isLayerVisible: (layerId: string) => boolean
  setLayers: (layers: Layer[]) => void
  setActiveLayerId: (layerId: string | null) => void
}

const DEFAULT_LAYER_NAME = 'Layer'

function generateLayerId(): string {
  return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useLayerManager = (
  initialLayers: Layer[] = [],
  initialActiveLayerId: string | null = null
): UseLayerManagerReturn => {
  const [layers, setLayersState] = useState<Layer[]>(() => {
    if (initialLayers.length === 0) {
      const defaultLayer: Layer = {
        id: generateLayerId(),
        name: `${DEFAULT_LAYER_NAME} 1`,
        visible: true,
        locked: false,
        opacity: 1,
        order: 0
      }
      return [defaultLayer]
    }
    return initialLayers
  })

  const [activeLayerId, setActiveLayerIdState] = useState<string | null>(() => {
    if (initialActiveLayerId) {
      return initialActiveLayerId
    }
    return layers.length > 0 ? layers[0].id : null
  })

  const setLayers = useCallback((newLayers: Layer[]) => {
    setLayersState(newLayers)
  }, [])

  const setActiveLayerId = useCallback((layerId: string | null) => {
    setActiveLayerIdState(layerId)
  }, [])

  const addLayer = useCallback((name?: string): string => {
    const newLayerId = generateLayerId()
    const maxOrder = Math.max(...layers.map(l => l.order), -1)
    const layerNumber = layers.length + 1

    const newLayer: Layer = {
      id: newLayerId,
      name: name || `${DEFAULT_LAYER_NAME} ${layerNumber}`,
      visible: true,
      locked: false,
      opacity: 1,
      order: maxOrder + 1
    }

    setLayersState(prev => [...prev, newLayer])
    setActiveLayerIdState(newLayerId)
    return newLayerId
  }, [layers])

  const removeLayer = useCallback((layerId: string) => {
    if (layers.length <= 1) {
      return
    }

    setLayersState(prev => {
      const newLayers = prev.filter(l => l.id !== layerId)
      if (activeLayerId === layerId && newLayers.length > 0) {
        setActiveLayerIdState(newLayers[0].id)
      }
      return newLayers
    })
  }, [layers.length, activeLayerId])

  const updateLayer = useCallback((layerId: string, updates: Partial<Omit<Layer, 'id'>>) => {
    setLayersState(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    )
  }, [])

  const setActiveLayer = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (layer && !layer.locked) {
      setActiveLayerIdState(layerId)
    }
  }, [layers])

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setLayersState(prev => {
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
    updateLayer(layerId, { visible: !layers.find(l => l.id === layerId)?.visible })
  }, [layers, updateLayer])

  const toggleLayerLock = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId)
    if (layer) {
      updateLayer(layerId, { locked: !layer.locked })
      if (!layer.locked && activeLayerId === layerId) {
        const firstUnlockedLayer = layers.find(l => l.id !== layerId && !l.locked)
        if (firstUnlockedLayer) {
          setActiveLayerIdState(firstUnlockedLayer.id)
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
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    getVisibleLayers,
    isLayerLocked,
    isLayerVisible,
    setLayers,
    setActiveLayerId
  }
}
