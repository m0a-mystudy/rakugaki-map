import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'
import { TileCoord, TILE_SIZE } from '../types'

/**
 * ピクセル座標からタイル座標を計算
 * Google Maps のタイル座標系に合わせた計算
 */
export function pixelToTileCoord(
  pixelX: number,
  pixelY: number,
  zoom: number,
  mapBounds: { north: number; south: number; east: number; west: number },
  mapSize: { width: number; height: number }
): TileCoord {
  // マップの総タイル数（2^zoom）
  const totalTiles = Math.pow(2, zoom)

  // ピクセル座標を経度緯度に変換
  const lng = mapBounds.west + (pixelX / mapSize.width) * (mapBounds.east - mapBounds.west)
  const lat = mapBounds.north - (pixelY / mapSize.height) * (mapBounds.north - mapBounds.south)

  // 経度からタイルX座標を計算
  const x = Math.floor(((lng + 180) / 360) * totalTiles)

  // 緯度からタイルY座標を計算（メルカトル投影）
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * totalTiles
  )

  return { zoom, x, y }
}

/**
 * タイル座標からピクセル座標（タイルの左上）を計算
 */
export function tileCoordToPixel(
  coord: TileCoord,
  mapBounds: { north: number; south: number; east: number; west: number },
  mapSize: { width: number; height: number }
): { x: number; y: number } {
  const totalTiles = Math.pow(2, coord.zoom)

  // タイルX座標から経度を計算
  const lng = (coord.x / totalTiles) * 360 - 180

  // タイルY座標から緯度を計算（メルカトル投影）
  const n = Math.PI - (2 * Math.PI * coord.y) / totalTiles
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))

  // 経度緯度からピクセル座標に変換
  const x = ((lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * mapSize.width
  const y = ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * mapSize.height

  return { x, y }
}

/**
 * タイル座標からキー文字列を生成
 */
export function getTileKey(coord: TileCoord): string {
  return `${coord.zoom}_${coord.x}_${coord.y}`
}

/**
 * キー文字列からタイル座標をパース
 */
export function parseTileKey(key: string): TileCoord {
  const [zoom, x, y] = key.split('_').map(Number)
  return { zoom, x, y }
}

/**
 * 可視範囲のタイル座標一覧を取得
 */
export function getVisibleTiles(
  mapBounds: { north: number; south: number; east: number; west: number },
  zoom: number
): TileCoord[] {
  const totalTiles = Math.pow(2, zoom)
  const tiles: TileCoord[] = []

  // 西端と東端のタイルX座標
  const minX = Math.floor(((mapBounds.west + 180) / 360) * totalTiles)
  const maxX = Math.floor(((mapBounds.east + 180) / 360) * totalTiles)

  // 北端と南端のタイルY座標
  const northRad = (mapBounds.north * Math.PI) / 180
  const southRad = (mapBounds.south * Math.PI) / 180
  const minY = Math.floor(
    ((1 - Math.log(Math.tan(northRad) + 1 / Math.cos(northRad)) / Math.PI) / 2) * totalTiles
  )
  const maxY = Math.floor(
    ((1 - Math.log(Math.tan(southRad) + 1 / Math.cos(southRad)) / Math.PI) / 2) * totalTiles
  )

  // 可視範囲のタイルを列挙
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      // タイル座標の範囲チェック
      if (x >= 0 && x < totalTiles && y >= 0 && y < totalTiles) {
        tiles.push({ zoom, x, y })
      }
    }
  }

  return tiles
}

/**
 * CanvasをWebPに変換してFirebase Storageにアップロード
 */
export async function uploadTile(
  drawingId: string,
  layerId: string,
  coord: TileCoord,
  canvas: HTMLCanvasElement
): Promise<string> {
  const tileKey = getTileKey(coord)
  const path = `drawings/${drawingId}/layers/${layerId}/tiles/${tileKey}.webp`
  const storageRef = ref(storage, path)

  // CanvasをWebP Blobに変換
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      'image/webp',
      0.9 // 品質
    )
  })

  // アップロード
  await uploadBytes(storageRef, blob, {
    contentType: 'image/webp',
  })

  // ダウンロードURLを取得
  return getDownloadURL(storageRef)
}

/**
 * Firebase Storageからタイル画像をダウンロード
 */
export async function downloadTile(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Failed to load tile: ${e}`))
    img.src = url
  })
}

/**
 * Firebase Storageからタイルを削除
 */
export async function deleteTile(
  drawingId: string,
  layerId: string,
  coord: TileCoord
): Promise<void> {
  const tileKey = getTileKey(coord)
  const path = `drawings/${drawingId}/layers/${layerId}/tiles/${tileKey}.webp`
  const storageRef = ref(storage, path)

  try {
    await deleteObject(storageRef)
  } catch (error: any) {
    // ファイルが存在しない場合は無視
    if (error.code !== 'storage/object-not-found') {
      throw error
    }
  }
}

/**
 * レイヤーの全タイルを削除
 */
export async function deleteLayerTiles(
  drawingId: string,
  layerId: string,
  tiles: TileCoord[]
): Promise<void> {
  await Promise.all(
    tiles.map((coord) => deleteTile(drawingId, layerId, coord))
  )
}

/**
 * 描画の全タイルを削除
 */
export async function deleteDrawingTiles(
  drawingId: string,
  layers: { id: string; tiles: TileCoord[] }[]
): Promise<void> {
  await Promise.all(
    layers.map((layer) => deleteLayerTiles(drawingId, layer.id, layer.tiles))
  )
}

/**
 * 空のタイルCanvasを作成
 */
export function createEmptyTileCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  return canvas
}

/**
 * タイルCanvasが空かどうかを判定
 */
export function isTileEmpty(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // アルファチャンネルをチェック（全て0なら空）
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      return false
    }
  }

  return true
}

/**
 * 描画がまたがるタイル一覧を取得
 */
export function getAffectedTiles(
  points: { x: number; y: number }[],
  lineWidth: number,
  zoom: number,
  mapBounds: { north: number; south: number; east: number; west: number },
  mapSize: { width: number; height: number }
): TileCoord[] {
  const tileSet = new Set<string>()
  const halfWidth = lineWidth / 2

  for (const point of points) {
    // 線幅を考慮した範囲の4隅をチェック
    const corners = [
      { x: point.x - halfWidth, y: point.y - halfWidth },
      { x: point.x + halfWidth, y: point.y - halfWidth },
      { x: point.x - halfWidth, y: point.y + halfWidth },
      { x: point.x + halfWidth, y: point.y + halfWidth },
    ]

    for (const corner of corners) {
      const coord = pixelToTileCoord(corner.x, corner.y, zoom, mapBounds, mapSize)
      tileSet.add(getTileKey(coord))
    }
  }

  return Array.from(tileSet).map(parseTileKey)
}
