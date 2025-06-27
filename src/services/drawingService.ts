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

export const saveDrawing = async (
  drawingId: string, 
  shapes: Shape[], 
  center: { lat: number; lng: number },
  zoom: number
): Promise<void> => {
  const drawingRef = doc(db, COLLECTION_NAME, drawingId)
  
  const drawingData = {
    shapes,
    center,
    zoom,
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
}

export const loadDrawing = async (drawingId: string): Promise<DrawingData | null> => {
  const drawingRef = doc(db, COLLECTION_NAME, drawingId)
  const drawingSnap = await getDoc(drawingRef)
  
  if (drawingSnap.exists()) {
    const data = drawingSnap.data()
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
  
  return null
}