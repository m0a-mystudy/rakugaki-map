import React, { useState } from 'react'
import type { Layer } from '../types'

interface LayerPanelProps {
  layers: Layer[]
  activeLayerId: string | null
  addLayer: (name?: string) => string
  removeLayer: (layerId: string) => void
  updateLayer: (layerId: string, updates: Partial<Omit<Layer, 'id'>>) => void
  setActiveLayer: (layerId: string) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  toggleLayerVisibility: (layerId: string) => void
  toggleLayerLock: (layerId: string) => void
  isVisible?: boolean
  onToggleVisibility?: () => void
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  addLayer,
  removeLayer,
  updateLayer,
  setActiveLayer,
  reorderLayers,
  toggleLayerVisibility,
  toggleLayerLock,
  isVisible = true,
  onToggleVisibility
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const sortedLayers = [...layers].sort((a, b) => b.order - a.order)

  const handleStartEdit = (layer: Layer) => {
    setEditingLayerId(layer.id)
    setEditingName(layer.name)
  }

  const handleSaveEdit = () => {
    if (editingLayerId && editingName.trim()) {
      updateLayer(editingLayerId, { name: editingName.trim() })
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderLayers(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  const handleOpacityChange = (layerId: string, opacity: number) => {
    updateLayer(layerId, { opacity })
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <h3>Layers</h3>
        <div className="layer-panel-controls">
          <button
            onClick={() => addLayer()}
            className="layer-btn layer-add-btn"
            title="Add Layer"
          >
            ➕
          </button>
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="layer-btn layer-collapse-btn"
              title="Hide Layers"
            >
              ✖️
            </button>
          )}
        </div>
      </div>

      <div className="layer-list">
        {sortedLayers.map((layer, index) => (
          <div
            key={layer.id}
            className={`layer-item ${layer.id === activeLayerId ? 'active' : ''} ${layer.locked ? 'locked' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => !layer.locked && setActiveLayer(layer.id)}
          >
            <div className="layer-item-content">
              <div className="layer-controls">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerVisibility(layer.id)
                  }}
                  className={`layer-btn visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? '👁️' : '🙈'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerLock(layer.id)
                  }}
                  className={`layer-btn lock-btn ${layer.locked ? 'locked' : 'unlocked'}`}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
              </div>

              <div className="layer-info">
                {editingLayerId === layer.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyPress}
                    className="layer-name-input"
                    autoFocus
                  />
                ) : (
                  <span
                    className="layer-name"
                    onDoubleClick={() => handleStartEdit(layer)}
                  >
                    {layer.name}
                  </span>
                )}

                <div className="layer-opacity">
                  <label className="opacity-label">
                    Opacity: {Math.round(layer.opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={layer.opacity}
                    onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                    className="opacity-slider"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="layer-actions">
                {layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeLayer(layer.id)
                    }}
                    className="layer-btn delete-btn"
                    title="Delete Layer"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .layer-panel {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          min-width: 250px;
          max-width: 300px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }


        .layer-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }

        .layer-panel-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .layer-panel-controls {
          display: flex;
          gap: 4px;
        }

        .layer-btn {
          width: 28px;
          height: 28px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .layer-btn:hover {
          background: #f5f5f5;
          border-color: #bbb;
        }

        .layer-add-btn:hover {
          background: #e8f5e8;
          border-color: #4CAF50;
        }

        .layer-collapse-btn:hover {
          background: #ffe8e8;
          border-color: #f44336;
        }

        .layer-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .layer-item {
          border: 1px solid #eee;
          border-radius: 6px;
          margin-bottom: 6px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .layer-item:hover {
          border-color: #ddd;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .layer-item.active {
          border-color: #2196F3;
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
          background: rgba(33, 150, 243, 0.05);
        }

        .layer-item.locked {
          opacity: 0.7;
          background: #f9f9f9;
        }

        .layer-item-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .layer-controls {
          display: flex;
          gap: 4px;
        }

        .visibility-btn.hidden {
          background: #ffebee;
          border-color: #e57373;
        }

        .lock-btn.locked {
          background: #fff3e0;
          border-color: #ffb74d;
        }

        .layer-info {
          flex: 1;
          min-width: 0;
        }

        .layer-name {
          display: block;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .layer-name-input {
          width: 100%;
          padding: 2px 4px;
          border: 1px solid #2196F3;
          border-radius: 3px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .layer-opacity {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .opacity-label {
          font-size: 11px;
          color: #666;
          font-weight: 500;
        }

        .opacity-slider {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: #ddd;
          outline: none;
          cursor: pointer;
        }

        .opacity-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #2196F3;
          cursor: pointer;
        }

        .opacity-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #2196F3;
          cursor: pointer;
          border: none;
        }

        .layer-actions {
          display: flex;
          gap: 4px;
        }

        .delete-btn:hover {
          background: #ffebee;
          border-color: #e57373;
        }
      `}</style>
    </div>
  )
}

export default LayerPanel
