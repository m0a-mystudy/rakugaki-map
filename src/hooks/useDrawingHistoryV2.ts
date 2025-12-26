import { useRef, useCallback } from 'react'
import { parseTileKey } from '../services/tileService'
import type { TileCacheManager } from './useTileCache'

interface TileSnapshot {
  tileKey: string
  imageData: ImageData
}

interface LayerSnapshot {
  layerId: string
  tiles: TileSnapshot[]
}

interface HistoryEntry {
  before: LayerSnapshot[]
  after: LayerSnapshot[]
}

const MAX_HISTORY_SIZE = 20

export function useDrawingHistoryV2(tileCache: TileCacheManager) {
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<HistoryEntry[]>([])
  const pendingSnapshotRef = useRef<LayerSnapshot[] | null>(null)

  /**
   * レイヤーの現在の状態をスナップショットとして保存
   */
  const captureLayerSnapshot = useCallback((layerId: string): LayerSnapshot => {
    const tileKeys = tileCache.getLayerTileKeys(layerId)
    const tiles: TileSnapshot[] = []

    for (const tileKey of tileKeys) {
      const coord = parseTileKey(tileKey)
      const imageData = tileCache.getTileImageData(layerId, coord)
      if (imageData) {
        tiles.push({
          tileKey,
          imageData: new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
          )
        })
      }
    }

    return { layerId, tiles }
  }, [tileCache])

  /**
   * 描画開始前にスナップショットを保存
   */
  const saveSnapshot = useCallback((layerId: string) => {
    const snapshot = captureLayerSnapshot(layerId)
    pendingSnapshotRef.current = [snapshot]
  }, [captureLayerSnapshot])

  /**
   * 描画完了後にスナップショットを確定してヒストリに追加
   */
  const commitSnapshot = useCallback((layerId: string) => {
    if (!pendingSnapshotRef.current) return

    const beforeSnapshot = pendingSnapshotRef.current
    const afterSnapshot = [captureLayerSnapshot(layerId)]

    // 変更があるかチェック
    const hasChanges = beforeSnapshot.some((before, index) => {
      const after = afterSnapshot[index]
      if (before.tiles.length !== after.tiles.length) return true

      return before.tiles.some((beforeTile, tileIndex) => {
        const afterTile = after.tiles[tileIndex]
        if (!afterTile || beforeTile.tileKey !== afterTile.tileKey) return true

        // ImageData の比較
        const beforeData = beforeTile.imageData.data
        const afterData = afterTile.imageData.data
        if (beforeData.length !== afterData.length) return true

        for (let i = 0; i < beforeData.length; i++) {
          if (beforeData[i] !== afterData[i]) return true
        }
        return false
      })
    })

    if (hasChanges) {
      undoStackRef.current.push({
        before: beforeSnapshot,
        after: afterSnapshot
      })

      // 最大サイズを超えたら古いエントリを削除
      if (undoStackRef.current.length > MAX_HISTORY_SIZE) {
        undoStackRef.current.shift()
      }

      // redo スタックをクリア
      redoStackRef.current = []
    }

    pendingSnapshotRef.current = null
  }, [captureLayerSnapshot])

  /**
   * スナップショットをキャンセル
   */
  const cancelSnapshot = useCallback(() => {
    pendingSnapshotRef.current = null
  }, [])

  /**
   * スナップショットを復元
   */
  const restoreSnapshot = useCallback((snapshots: LayerSnapshot[]) => {
    for (const snapshot of snapshots) {
      // 現在のタイルをクリア
      tileCache.clearLayerTiles(snapshot.layerId)

      // スナップショットからタイルを復元
      for (const tile of snapshot.tiles) {
        const coord = parseTileKey(tile.tileKey)
        tileCache.setTileImageData(snapshot.layerId, coord, tile.imageData)
        tileCache.markTileDirty(snapshot.layerId, coord)
      }
    }
  }, [tileCache])

  /**
   * Undo
   */
  const undo = useCallback((): boolean => {
    const entry = undoStackRef.current.pop()
    if (!entry) return false

    // redo スタックに追加
    redoStackRef.current.push(entry)

    // before 状態を復元
    restoreSnapshot(entry.before)

    return true
  }, [restoreSnapshot])

  /**
   * Redo
   */
  const redo = useCallback((): boolean => {
    const entry = redoStackRef.current.pop()
    if (!entry) return false

    // undo スタックに追加
    undoStackRef.current.push(entry)

    // after 状態を復元
    restoreSnapshot(entry.after)

    return true
  }, [restoreSnapshot])

  /**
   * Undo 可能かどうか
   */
  const canUndo = useCallback((): boolean => {
    return undoStackRef.current.length > 0
  }, [])

  /**
   * Redo 可能かどうか
   */
  const canRedo = useCallback((): boolean => {
    return redoStackRef.current.length > 0
  }, [])

  /**
   * 履歴をクリア
   */
  const clear = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    pendingSnapshotRef.current = null
  }, [])

  return {
    saveSnapshot,
    commitSnapshot,
    cancelSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    clear
  }
}

export type DrawingHistoryV2 = ReturnType<typeof useDrawingHistoryV2>
