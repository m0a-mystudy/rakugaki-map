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
  layerId?: string
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  order: number
}

export interface DrawingData {
  id?: string
  shapes: Shape[]
  layers?: Layer[]
  activeLayerId?: string
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

// ============================================
// V2 タイルベース描画システム用の型定義
// ============================================

/** タイル座標 */
export interface TileCoord {
  zoom: number  // 描画時のズームレベル
  x: number     // タイルX座標
  y: number     // タイルY座標
}

/** タイル情報 */
export interface Tile {
  coord: TileCoord
  storageUrl: string       // Firebase Storage URL
  updatedAt: Date
}

/** レイヤー（V2タイル方式） */
export interface LayerV2 {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  order: number
  tiles: Tile[]            // このレイヤーのタイル一覧
}

/** 描画データV2（新コレクション: drawings_v2） */
export interface DrawingDataV2 {
  id?: string
  version: 2
  layers: LayerV2[]
  activeLayerId?: string
  baseZoom: number         // 描画の基準ズームレベル
  createdAt: Date
  updatedAt: Date
  userId?: string
}

/** タイルキャッシュエントリ */
export interface TileCacheEntry {
  canvas: HTMLCanvasElement
  dirty: boolean           // 未保存の変更あり
}

/** タイルキャッシュ構造 */
export interface TileCache {
  [layerId: string]: {
    [tileKey: string]: TileCacheEntry
  }
}

/** V2用のUndo/Redoコマンド */
export interface DrawingCommandV2 {
  type: 'DRAW' | 'ERASE' | 'CLEAR_LAYER'
  execute: () => void
  undo: () => void
  data: {
    layerId: string
    tileSnapshots: {
      tileKey: string
      beforeImageData: ImageData
      afterImageData: ImageData
    }[]
  }
}

/** V2用の履歴状態 */
export interface HistoryStateV2 {
  undoStack: DrawingCommandV2[]
  redoStack: DrawingCommandV2[]
  maxHistorySize: number
}

/** タイル定数 */
export const TILE_SIZE = 256
