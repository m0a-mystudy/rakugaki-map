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

    console.log('📝 Adding command:', command.type, 'undo stack size:', history.undoStack.length)

    // Clear redo stack when new command is added
    history.redoStack = []

    // Add command to undo stack
    history.undoStack.push(command)

    // Limit history size
    if (history.undoStack.length > history.maxHistorySize) {
      history.undoStack.shift()
    }

    console.log('📝 Command added, new undo stack size:', history.undoStack.length)
  }, [])

  const undo = useCallback((): boolean => {
    const history = historyRef.current

    if (history.undoStack.length === 0) {
      console.log('❌ Undo: No commands in undo stack')
      return false
    }

    const command = history.undoStack.pop()!
    console.log('🔄 Executing undo command:', command.type, 'remaining undo commands:', history.undoStack.length)
    command.undo()
    history.redoStack.push(command)

    return true
  }, [])

  const redo = useCallback((): boolean => {
    const history = historyRef.current

    if (history.redoStack.length === 0) {
      console.log('❌ Redo: No commands in redo stack')
      return false
    }

    const command = history.redoStack.pop()!
    console.log('🔁 Executing redo command:', command.type, 'remaining redo commands:', history.redoStack.length)
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
    (shape: Shape, getShapes: () => Shape[], setShapes: (shapes: Shape[]) => void): DrawingCommand => ({
      type: 'ADD_SHAPE',
      execute: () => {
        const currentShapes = getShapes()
        const newShapes = [...currentShapes, shape]
        console.log('▶️ ADD_SHAPE execute: from', currentShapes.length, 'to', newShapes.length, 'shapes')
        setShapes(newShapes)
      },
      undo: () => {
        const currentShapes = getShapes()
        console.log('◀️ ADD_SHAPE undo: current shapes:', currentShapes.length, 'shape ID:', shape.id)
        console.log('◀️ Current shape IDs:', currentShapes.map(s => s.id))
        // Remove the shape with the matching ID
        if (shape.id) {
          const foundShape = currentShapes.find(s => s.id === shape.id)
          console.log('◀️ Target shape found:', !!foundShape)
          const newShapes = currentShapes.filter(s => s.id !== shape.id)
          console.log('◀️ ADD_SHAPE undo by ID: from', currentShapes.length, 'to', newShapes.length, 'shapes')
          console.log('◀️ New shape IDs:', newShapes.map(s => s.id))
          setShapes(newShapes)
        } else {
          // Fallback: remove the last occurrence of this specific shape
          const shapeIndex = currentShapes.lastIndexOf(shape)
          if (shapeIndex !== -1) {
            const newShapes = currentShapes.filter((_, index) => index !== shapeIndex)
            console.log('◀️ ADD_SHAPE undo by index:', shapeIndex, 'from', currentShapes.length, 'to', newShapes.length, 'shapes')
            setShapes(newShapes)
          }
        }
      },
      data: { shape }
    }),
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
