import { useRef, useCallback } from 'react'
import { TileCoord, TileCacheEntry, TILE_SIZE } from '../types'
import { getTileKey, parseTileKey, createEmptyTileCanvas, downloadTile } from '../services/tileService'

interface TileCacheMap {
  [layerId: string]: {
    [tileKey: string]: TileCacheEntry
  }
}

export function useTileCache() {
  const cacheRef = useRef<TileCacheMap>({})

  /**
   * レイヤーのキャッシュを初期化
   */
  const initializeLayer = useCallback((layerId: string) => {
    if (!cacheRef.current[layerId]) {
      cacheRef.current[layerId] = {}
    }
  }, [])

  /**
   * レイヤーのキャッシュを削除
   */
  const removeLayer = useCallback((layerId: string) => {
    delete cacheRef.current[layerId]
  }, [])

  /**
   * タイルCanvasを取得（存在しなければ作成）
   */
  const getTileCanvas = useCallback((layerId: string, coord: TileCoord): HTMLCanvasElement => {
    initializeLayer(layerId)
    const tileKey = getTileKey(coord)

    if (!cacheRef.current[layerId][tileKey]) {
      cacheRef.current[layerId][tileKey] = {
        canvas: createEmptyTileCanvas(),
        dirty: false,
      }
    }

    return cacheRef.current[layerId][tileKey].canvas
  }, [initializeLayer])

  /**
   * タイルを dirty としてマーク
   */
  const markTileDirty = useCallback((layerId: string, coord: TileCoord) => {
    initializeLayer(layerId)
    const tileKey = getTileKey(coord)

    if (cacheRef.current[layerId][tileKey]) {
      cacheRef.current[layerId][tileKey].dirty = true
    }
  }, [initializeLayer])

  /**
   * 全ての dirty タイルを取得
   */
  const getDirtyTiles = useCallback((): { layerId: string; coord: TileCoord; canvas: HTMLCanvasElement }[] => {
    const dirtyTiles: { layerId: string; coord: TileCoord; canvas: HTMLCanvasElement }[] = []

    for (const layerId of Object.keys(cacheRef.current)) {
      for (const tileKey of Object.keys(cacheRef.current[layerId])) {
        const entry = cacheRef.current[layerId][tileKey]
        if (entry.dirty) {
          dirtyTiles.push({
            layerId,
            coord: parseTileKey(tileKey),
            canvas: entry.canvas,
          })
        }
      }
    }

    return dirtyTiles
  }, [])

  /**
   * dirty フラグをクリア
   */
  const clearDirtyFlags = useCallback(() => {
    for (const layerId of Object.keys(cacheRef.current)) {
      for (const tileKey of Object.keys(cacheRef.current[layerId])) {
        cacheRef.current[layerId][tileKey].dirty = false
      }
    }
  }, [])

  /**
   * 特定のタイルの dirty フラグをクリア
   */
  const clearTileDirtyFlag = useCallback((layerId: string, coord: TileCoord) => {
    const tileKey = getTileKey(coord)
    if (cacheRef.current[layerId]?.[tileKey]) {
      cacheRef.current[layerId][tileKey].dirty = false
    }
  }, [])

  /**
   * URLからタイルを読み込んでキャッシュに追加
   */
  const loadTileFromUrl = useCallback(async (
    layerId: string,
    coord: TileCoord,
    url: string
  ): Promise<HTMLCanvasElement> => {
    initializeLayer(layerId)
    const tileKey = getTileKey(coord)

    // 画像をダウンロード
    const img = await downloadTile(url)

    // Canvasに描画
    const canvas = createEmptyTileCanvas()
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE)
    }

    // キャッシュに追加
    cacheRef.current[layerId][tileKey] = {
      canvas,
      dirty: false,
    }

    return canvas
  }, [initializeLayer])

  /**
   * レイヤーの全タイルキーを取得
   */
  const getLayerTileKeys = useCallback((layerId: string): string[] => {
    if (!cacheRef.current[layerId]) {
      return []
    }
    return Object.keys(cacheRef.current[layerId])
  }, [])

  /**
   * タイルのImageDataを取得
   */
  const getTileImageData = useCallback((layerId: string, coord: TileCoord): ImageData | null => {
    const tileKey = getTileKey(coord)
    const entry = cacheRef.current[layerId]?.[tileKey]
    if (!entry) return null

    const ctx = entry.canvas.getContext('2d')
    if (!ctx) return null

    return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE)
  }, [])

  /**
   * タイルにImageDataを設定
   */
  const setTileImageData = useCallback((layerId: string, coord: TileCoord, imageData: ImageData) => {
    initializeLayer(layerId)
    const tileKey = getTileKey(coord)

    if (!cacheRef.current[layerId][tileKey]) {
      cacheRef.current[layerId][tileKey] = {
        canvas: createEmptyTileCanvas(),
        dirty: false,
      }
    }

    const ctx = cacheRef.current[layerId][tileKey].canvas.getContext('2d')
    if (ctx) {
      ctx.putImageData(imageData, 0, 0)
    }
  }, [initializeLayer])

  /**
   * タイルをクリア
   */
  const clearTile = useCallback((layerId: string, coord: TileCoord) => {
    const tileKey = getTileKey(coord)
    const entry = cacheRef.current[layerId]?.[tileKey]
    if (!entry) return

    const ctx = entry.canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE)
    }
  }, [])

  /**
   * レイヤーの全タイルをクリア
   */
  const clearLayerTiles = useCallback((layerId: string) => {
    if (!cacheRef.current[layerId]) return

    for (const tileKey of Object.keys(cacheRef.current[layerId])) {
      const entry = cacheRef.current[layerId][tileKey]
      const ctx = entry.canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE)
      }
      entry.dirty = true
    }
  }, [])

  /**
   * 全キャッシュをクリア
   */
  const clearAllCache = useCallback(() => {
    cacheRef.current = {}
  }, [])

  /**
   * タイルが存在するかチェック
   */
  const hasTile = useCallback((layerId: string, coord: TileCoord): boolean => {
    const tileKey = getTileKey(coord)
    return !!cacheRef.current[layerId]?.[tileKey]
  }, [])

  return {
    getTileCanvas,
    markTileDirty,
    getDirtyTiles,
    clearDirtyFlags,
    clearTileDirtyFlag,
    loadTileFromUrl,
    getLayerTileKeys,
    getTileImageData,
    setTileImageData,
    clearTile,
    clearLayerTiles,
    clearAllCache,
    initializeLayer,
    removeLayer,
    hasTile,
  }
}

export type TileCacheManager = ReturnType<typeof useTileCache>
