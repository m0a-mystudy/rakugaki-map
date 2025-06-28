import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// デバッグ: Firebase設定を確認
console.log('🔥 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
  authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
  projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
  appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing'
})

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// 開発環境でFirestoreエミュレーターを使用（オプション）
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  console.log('🔥 Using Firestore emulator')
  connectFirestoreEmulator(db, 'localhost', 8080)
}

// デバッグ: Firestore初期化確認
console.log('🔥 Firestore initialized:', db.app.name)

// 匿名認証の自動実行
export const initializeAuth = async () => {
  try {
    const user = await signInAnonymously(auth)
    console.log('🔥 Anonymous user signed in:', user.user.uid)
    return user.user
  } catch (error) {
    console.error('❌ Anonymous authentication failed:', error)
    throw error
  }
}

// 認証状態の監視
export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback)
}
