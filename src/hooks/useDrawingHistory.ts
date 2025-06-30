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
    (shape: Shape, shapes: Shape[], setShapes: (shapes: Shape[]) => void): DrawingCommand => ({
      type: 'ADD_SHAPE',
      execute: () => {
        const newShapes = [...shapes, shape]
        setShapes(newShapes)
      },
      undo: () => {
        const newShapes = shapes.filter((_, index) => index !== shapes.length - 1)
        setShapes(newShapes)
      },
      data: { shape }
    }),
    []
  )

  const createClearAllCommand = useCallback(
    (shapes: Shape[], setShapes: (shapes: Shape[]) => void): DrawingCommand => ({
      type: 'CLEAR_ALL',
      execute: () => {
        setShapes([])
      },
      undo: () => {
        setShapes(shapes)
      },
      data: { shapes }
    }),
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
