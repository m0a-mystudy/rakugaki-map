import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import type { DrawingData, Shape } from '../types'

const COLLECTION_NAME = 'drawings'

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
  zoom: number
): Promise<void> => {
  console.log('🔥 Starting save operation:', {
    drawingId,
    shapesCount: shapes.length,
    center,
    zoom
  })

  try {
    const drawingRef = doc(db, COLLECTION_NAME, drawingId)
    console.log('🔥 Document reference created:', drawingRef.path)

    const drawingData = {
      shapes,
      center,
      zoom,
      updatedAt: serverTimestamp()
    }

    console.log('🔥 Checking existing document...')
    const existingDoc = await getDoc(drawingRef)

    if (existingDoc.exists()) {
      console.log('🔥 Updating existing document')
      await updateDoc(drawingRef, drawingData)
      console.log('✅ Document updated successfully')
    } else {
      console.log('🔥 Creating new document')
      await setDoc(drawingRef, {
        ...drawingData,
        createdAt: serverTimestamp()
      })
      console.log('✅ Document created successfully')
    }
  } catch (error) {
    console.error('❌ Save error:', error)
    throw error
  }
}

export const loadDrawing = async (drawingId: string): Promise<DrawingData | null> => {
  console.log('🔥 Loading drawing:', drawingId)

  try {
    const drawingRef = doc(db, COLLECTION_NAME, drawingId)
    console.log('🔥 Document reference created:', drawingRef.path)

    const drawingSnap = await getDoc(drawingRef)
    console.log('🔥 Document exists:', drawingSnap.exists())

    if (drawingSnap.exists()) {
      const data = drawingSnap.data()
      console.log('🔥 Document data:', data)

      return {
        id: drawingId,
        shapes: data.shapes || [],
        center: data.center,
        zoom: data.zoom,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate(),
        userId: data.userId
      }
    }

    console.log('⚠️ Document not found')
    return null
  } catch (error) {
    console.error('❌ Load error:', error)
    throw error
  }
}
