export type DrawingTool = 'pan' | 'pen' | 'rectangle' | 'circle' | 'line' | 'eraser'

export interface Point {
  lat: number
  lng: number
  pressure?: number
}

export interface Shape {
  id?: string
  type: DrawingTool
  points: Point[]
  color: string
  width: number
  baseZoom?: number
}

export interface DrawingData {
  id?: string
  shapes: Shape[]
  center: {
    lat: number
    lng: number
  }
  zoom: number
  createdAt: Date
  updatedAt: Date
  userId?: string
}

export interface DrawingCommand {
  type: 'ADD_SHAPE' | 'REMOVE_SHAPE' | 'CLEAR_ALL'
  execute: () => void
  undo: () => void
  data: {
    shape?: Shape
    shapes?: Shape[]
    index?: number
  }
}

export interface HistoryState {
  undoStack: DrawingCommand[]
  redoStack: DrawingCommand[]
  maxHistorySize: number
}
