export type DrawingTool = 'pen' | 'rectangle' | 'circle' | 'line'

export interface Point {
  lat: number
  lng: number
  pressure?: number
}

export interface Shape {
  type: DrawingTool
  points: Point[]
  color: string
  width: number
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
