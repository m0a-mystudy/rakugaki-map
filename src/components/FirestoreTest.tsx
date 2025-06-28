import { useState } from 'react'
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'

const FirestoreTest = () => {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testFirestore = async () => {
    setIsLoading(true)
    setTestResult('')

    try {
      console.log('🔥 Testing Firestore connection...')

      // Test 1: Simple write test
      const testId = `test-${Date.now()}`
      const testRef = doc(db, 'drawings', testId)

      console.log('🔥 Writing test document...')
      await setDoc(testRef, {
        test: true,
        timestamp: new Date(),
        message: 'Firestore connection test'
      })

      console.log('✅ Test document written')

      // Test 2: Read back the document
      console.log('🔥 Reading test document...')
      const testSnap = await getDoc(testRef)

      if (testSnap.exists()) {
        console.log('✅ Test document read successfully:', testSnap.data())
        setTestResult('✅ Firestore is working correctly!')
      } else {
        setTestResult('❌ Could not read back test document')
      }

    } catch (error) {
      console.error('❌ Firestore test failed:', error)
      setTestResult(`❌ Firestore error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '5px',
      zIndex: 1000
    }}>
      <h4>Firestore Test</h4>
      <button
        onClick={testFirestore}
        disabled={isLoading}
        style={{ marginBottom: '10px' }}
      >
        {isLoading ? 'Testing...' : 'Test Firestore'}
      </button>
      {testResult && (
        <div style={{ fontSize: '12px', maxWidth: '200px' }}>
          {testResult}
        </div>
      )}
    </div>
  )
}

export default FirestoreTest
