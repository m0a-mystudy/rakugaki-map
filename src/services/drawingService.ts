import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import type { DrawingData, Shape, Layer, DrawingDataV2, LayerV2, TileCoord } from '../types'
import { uploadTile, getTileKey } from './tileService'
import type { TileCacheManager } from '../hooks/useTileCache'

const COLLECTION_NAME = 'drawings'
const COLLECTION_NAME_V2 = 'drawings_v2'

export const generateDrawingId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

export const generateShapeId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

export const saveDrawing = async (
  drawingId: string,
  shapes: Shape[],
  center: { lat: number; lng: number },
  zoom: number,
  layers?: Layer[],
  activeLayerId?: string | null
): Promise<void> => {
  try {
    const drawingRef = doc(db, COLLECTION_NAME, drawingId)
    const drawingData = {
      shapes,
      center,
      zoom,
      ...(layers && { layers }),
      ...(activeLayerId && { activeLayerId }),
      updatedAt: serverTimestamp()
    }

    const existingDoc = await getDoc(drawingRef)

    if (existingDoc.exists()) {
      await updateDoc(drawingRef, drawingData)
    } else {
      await setDoc(drawingRef, {
        ...drawingData,
        createdAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('❌ Save error:', error)
    throw error
  }
}

export const loadDrawing = async (drawingId: string): Promise<DrawingData | null> => {
  try {
    const drawingRef = doc(db, COLLECTION_NAME, drawingId)
    const drawingSnap = await getDoc(drawingRef)

    if (drawingSnap.exists()) {
      const data = drawingSnap.data()
      return {
        id: drawingId,
        shapes: data.shapes || [],
        layers: data.layers,
        activeLayerId: data.activeLayerId,
        center: data.center,
        zoom: data.zoom,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        userId: data.userId
      }
    }

    return null
  } catch (error) {
    console.error('❌ Load error:', error)
    throw error
  }
}

// ============================================
// V2 タイルベース描画システム用の関数
// ============================================

/**
 * V2形式の描画データを保存
 * dirty タイルをFirebase Storageにアップロードし、メタデータをFirestoreに保存
 */
export const saveDrawingV2 = async (
  drawingId: string,
  layers: LayerV2[],
  activeLayerId: string | null,
  baseZoom: number,
  tileCache: TileCacheManager
): Promise<LayerV2[]> => {
  try {
    // dirty タイルをアップロード
    const dirtyTiles = tileCache.getDirtyTiles()
    const uploadPromises: Promise<{ layerId: string; coord: TileCoord; url: string }>[] = []

    for (const { layerId, coord, canvas } of dirtyTiles) {
      uploadPromises.push(
        uploadTile(drawingId, layerId, coord, canvas).then(url => ({
          layerId,
          coord,
          url
        }))
      )
    }

    const uploadedTiles = await Promise.all(uploadPromises)

    // レイヤーデータを更新（アップロードしたタイルのURLを追加）
    const updatedLayers = layers.map(layer => {
      const layerTiles = uploadedTiles.filter(t => t.layerId === layer.id)

      // 既存のタイルと新しいタイルをマージ
      const existingTiles = new Map(
        layer.tiles.map(t => [getTileKey(t.coord), t])
      )

      for (const { coord, url } of layerTiles) {
        existingTiles.set(getTileKey(coord), {
          coord,
          storageUrl: url,
          updatedAt: new Date()
        })
      }

      return {
        ...layer,
        tiles: Array.from(existingTiles.values())
      }
    })

    // Firestoreにメタデータを保存
    const drawingRef = doc(db, COLLECTION_NAME_V2, drawingId)
    const drawingData = {
      version: 2,
      layers: updatedLayers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity,
        order: layer.order,
        tiles: layer.tiles.map(tile => ({
          coord: tile.coord,
          storageUrl: tile.storageUrl,
          updatedAt: Timestamp.fromDate(tile.updatedAt instanceof Date ? tile.updatedAt : new Date(tile.updatedAt))
        }))
      })),
      activeLayerId,
      baseZoom,
      updatedAt: serverTimestamp()
    }

    console.log('📝 Saving to Firestore:', {
      drawingId,
      layerCount: updatedLayers.length,
      tileCount: updatedLayers.reduce((sum, l) => sum + l.tiles.length, 0),
      baseZoom,
      drawingData
    })

    const existingDoc = await getDoc(drawingRef)

    try {
      if (existingDoc.exists()) {
        await updateDoc(drawingRef, drawingData)
        console.log('✅ Firestore updated')
      } else {
        await setDoc(drawingRef, {
          ...drawingData,
          createdAt: serverTimestamp()
        })
        console.log('✅ Firestore created')
      }
    } catch (firestoreError) {
      console.error('❌ Firestore write failed:', firestoreError)
      throw firestoreError
    }

    // dirty フラグをクリア
    tileCache.clearDirtyFlags()

    return updatedLayers
  } catch (error) {
    console.error('❌ V2 Save error:', error)
    throw error
  }
}

/**
 * V2形式の描画データを読み込み
 */
export const loadDrawingV2 = async (drawingId: string): Promise<DrawingDataV2 | null> => {
  try {
    const drawingRef = doc(db, COLLECTION_NAME_V2, drawingId)
    const drawingSnap = await getDoc(drawingRef)

    if (drawingSnap.exists()) {
      const data = drawingSnap.data()
      return {
        id: drawingId,
        version: 2,
        layers: (data.layers || []).map((layer: any) => ({
          id: layer.id,
          name: layer.name,
          visible: layer.visible,
          locked: layer.locked,
          opacity: layer.opacity,
          order: layer.order,
          tiles: (layer.tiles || []).map((tile: any) => ({
            coord: tile.coord,
            storageUrl: tile.storageUrl,
            updatedAt: tile.updatedAt instanceof Timestamp
              ? tile.updatedAt.toDate()
              : new Date(tile.updatedAt)
          }))
        })),
        activeLayerId: data.activeLayerId,
        baseZoom: data.baseZoom,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        userId: data.userId
      }
    }

    return null
  } catch (error) {
    console.error('❌ V2 Load error:', error)
    throw error
  }
}

/**
 * V2形式かどうかを判定
 */
export const isV2Drawing = async (drawingId: string): Promise<boolean> => {
  try {
    const drawingRef = doc(db, COLLECTION_NAME_V2, drawingId)
    const drawingSnap = await getDoc(drawingRef)
    return drawingSnap.exists()
  } catch (error) {
    return false
  }
}
