import { useRef, useCallback } from 'react'
import { DrawingCommand, HistoryState, Shape } from '../types'

const MAX_HISTORY_SIZE = 50

export function useDrawingHistory() {
  const historyRef = useRef<HistoryState>({
    undoStack: [],
    redoStack: [],
    maxHistorySize: MAX_HISTORY_SIZE
  })

  const addCommand = useCallback((command: DrawingCommand) => {
    const history = historyRef.current

    // Clear redo stack when new command is added
    history.redoStack = []

    // Add command to undo stack
    history.undoStack.push(command)

    // Limit history size
    if (history.undoStack.length > history.maxHistorySize) {
      history.undoStack.shift()
    }

  }, [])

  const undo = useCallback((): boolean => {
    const history = historyRef.current

    if (history.undoStack.length === 0) {
      return false
    }

    const command = history.undoStack.pop()!
    command.undo()
    history.redoStack.push(command)

    return true
  }, [])

  const redo = useCallback((): boolean => {
    const history = historyRef.current

    if (history.redoStack.length === 0) {
      return false
    }

    const command = history.redoStack.pop()!
    command.execute()
    history.undoStack.push(command)

    return true
  }, [])

  const canUndo = useCallback((): boolean => {
    return historyRef.current.undoStack.length > 0
  }, [])

  const canRedo = useCallback((): boolean => {
    return historyRef.current.redoStack.length > 0
  }, [])

  const clear = useCallback(() => {
    historyRef.current.undoStack = []
    historyRef.current.redoStack = []
  }, [])

  const createAddShapeCommand = useCallback(
    (shape: Shape, getShapes: () => Shape[], setShapes: (shapes: Shape[]) => void): DrawingCommand => {
      const shapeSnapshot = { ...shape }  // Create a deep copy of the shape
      return {
        type: 'ADD_SHAPE',
        execute: () => {
          const currentShapes = getShapes()
          const newShapes = [...currentShapes, shapeSnapshot]
          setShapes(newShapes)
        },
        undo: () => {
          const currentShapes = getShapes()

          // Simple approach: remove the last shape (most recently added)
          if (currentShapes.length > 0) {
            const newShapes = currentShapes.slice(0, -1)
            setShapes(newShapes)
          }
        },
        data: { shape: shapeSnapshot }
      }
    },
    []
  )

  const createClearAllCommand = useCallback(
    (getShapes: () => Shape[], setShapes: (shapes: Shape[]) => void): DrawingCommand => {
      const shapesToRestore = getShapes() // Capture current shapes at command creation time
      return {
        type: 'CLEAR_ALL',
        execute: () => {
          setShapes([])
        },
        undo: () => {
          setShapes(shapesToRestore)
        },
        data: { shapes: shapesToRestore }
      }
    },
    []
  )

  return {
    addCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    createAddShapeCommand,
    createClearAllCommand
  }
}
