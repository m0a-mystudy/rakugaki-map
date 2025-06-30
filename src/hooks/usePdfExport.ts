import { useState, useCallback } from 'react'
import jsPDF from 'jspdf'

interface PdfExportOptions {
  filename?: string
  quality?: number
  format?: 'a4' | 'a3' | 'letter'
  orientation?: 'portrait' | 'landscape'
  map?: google.maps.Map
  shapes?: any[] // Drawing shapes data
}

export const usePdfExport = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const exportToPdf = useCallback(async (
    mapContainer: HTMLElement,
    options: PdfExportOptions = {}
  ) => {
    const {
      filename = 'rakugaki-map',
      format = 'a4',
      orientation = 'landscape',
      map,
      shapes
    } = options

    setIsExporting(true)
    setExportError(null)

    try {
      // Get map container dimensions
      const rect = mapContainer.getBoundingClientRect()
      const mapWidth = rect.width
      const mapHeight = rect.height

      console.log('📋 Starting PDF export...', { mapWidth, mapHeight })

      // Create composite canvas
      const compositeCanvas = document.createElement('canvas')
      const scale = 2 // High resolution
      compositeCanvas.width = mapWidth * scale
      compositeCanvas.height = mapHeight * scale
      const ctx = compositeCanvas.getContext('2d')!

      // Enable maximum quality rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Variables for static map dimensions
      let staticWidth = 640
      let staticHeight = 640
      let mapScale = 2 // 2x for high DPI

      // Get current map state
      let mapState = null
      if (map) {
        console.log('🗺️ Using provided map instance')
        mapState = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          mapTypeId: map.getMapTypeId(),
          heading: map.getHeading() || 0,
          tilt: map.getTilt() || 0
        }
      }
      console.log('🗺️ Map state:', mapState)

      // Use Google Maps Static API to get map image
      if (mapState && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        console.log('📸 Using Google Maps Static API...')

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

        // Use current screen view for PDF export
        const mapCenter = { lat: mapState.center!.lat(), lng: mapState.center!.lng() }
        const zoom = Math.round(mapState.zoom!)

        console.log('🎯 Using current screen view for PDF export:', {
          center: mapCenter,
          zoom: zoom
        })

        const center = `${mapCenter.lat},${mapCenter.lng}`

        // Calculate map size based on container aspect ratio
        const aspectRatio = mapWidth / mapHeight

        if (aspectRatio > 1) {
          // Landscape
          staticWidth = 640
          staticHeight = Math.round(640 / aspectRatio)
        } else {
          // Portrait
          staticHeight = 640
          staticWidth = Math.round(640 * aspectRatio)
        }

        const size = `${staticWidth}x${staticHeight}`


        // Create static map URL with grayscale styling
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
          `center=${center}&` +
          `zoom=${zoom}&` +
          `size=${size}&` +
          `scale=${mapScale}&` +
          `maptype=roadmap&` +
          `format=png32&` +
          `style=saturation:-100&` +
          `key=${apiKey}`

        console.log('🌍 Static map URL:', staticMapUrl)

        try {
          // Load map image
          const mapImage = new Image()
          mapImage.crossOrigin = 'anonymous'

          await new Promise((resolve, reject) => {
            mapImage.onload = resolve
            mapImage.onerror = reject
            mapImage.src = staticMapUrl
          })

          // Draw map image to canvas
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height)
          ctx.drawImage(mapImage, 0, 0, compositeCanvas.width, compositeCanvas.height)

          console.log('✅ Map image loaded successfully')

        } catch (staticError) {
          console.warn('❌ Static map failed:', staticError)
          ctx.fillStyle = '#f0f0f0'
          ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height)
        }
      } else {
        console.log('📄 Using simple background')
        ctx.fillStyle = '#f5f5f5'
        ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height)
      }

      // Re-enable Canvas drawing to match Static API paths
      if (shapes && shapes.length > 0 && mapState && map) {
        console.log(`🎨 Re-rendering ${shapes.length} shapes...`)

        // Create a temporary overlay to get the exact same projection as the screen
        const overlay = new google.maps.OverlayView()
        overlay.setMap(map)

        // Wait for projection to be available
        await new Promise<void>((resolve) => {
          const checkProjection = () => {
            if (overlay.getProjection()) {
              resolve()
            } else {
              setTimeout(checkProjection, 10)
            }
          }
          checkProjection()
        })

        const projection = overlay.getProjection()
        if (!projection) {
          console.warn('❌ Could not get projection')
          overlay.setMap(null)
          return
        }

        // Calculate the viewport bounds based on the static map image
        // The static map shows a specific geographic area that we need to match
        const zoom = Math.round(mapState.zoom!)
        const centerLat = mapState.center!.lat()
        const centerLng = mapState.center!.lng()

        console.log('🗺️ Center coordinates:', { centerLat, centerLng, zoom })

        // Google Maps Static APIの正確なメートル/ピクセル計算
        // 標準的なGoogle Maps計算式を使用
        const metersPerPixelAtZoom = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom)

        // Calculate the geographic bounds that the static map covers
        // Static API calculates based on ACTUAL pixels requested (not accounting for scale parameter)
        // The scale parameter only affects image quality, not geographic coverage
        const mapWidthInMeters = staticWidth * metersPerPixelAtZoom
        const mapHeightInMeters = staticHeight * metersPerPixelAtZoom

        // Convert to degrees
        const metersPerDegreeLat = 111320
        const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180)

        const mapWidthInDegrees = mapWidthInMeters / metersPerDegreeLng
        const mapHeightInDegrees = mapHeightInMeters / metersPerDegreeLat

        // Calculate the bounds
        const bounds = {
          west: centerLng - mapWidthInDegrees / 2,
          east: centerLng + mapWidthInDegrees / 2,
          south: centerLat - mapHeightInDegrees / 2,
          north: centerLat + mapHeightInDegrees / 2
        }

        console.log('📐 Calculated bounds:', bounds)
        console.log('📐 Map dimensions:', {
          staticWidth,
          staticHeight,
          mapScale,
          zoom,
          centerLat,
          centerLng,
          compositeCanvasWidth: compositeCanvas.width,
          compositeCanvasHeight: compositeCanvas.height,
          pixelScale: compositeCanvas.width / (staticWidth * mapScale)
        })


        shapes.forEach((shape, index) => {
          try {
            ctx.strokeStyle = shape.color || '#ff0000'
            ctx.lineWidth = shape.width || 2  // scaleを適用せずに元の太さを維持
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            if (shape.type === 'pen' && shape.points && shape.points.length > 1) {
              ctx.beginPath()

              shape.points.forEach((point: any, pointIndex: number) => {
                // 同じbounds基準の座標変換を使用
                const relativeX = (point.lng - bounds.west) / mapWidthInDegrees
                const relativeY = (bounds.north - point.lat) / mapHeightInDegrees

                const canvasX = relativeX * compositeCanvas.width
                const canvasY = relativeY * compositeCanvas.height

                if (pointIndex === 0) {
                  ctx.moveTo(canvasX, canvasY)
                } else {
                  ctx.lineTo(canvasX, canvasY)
                }
              })

              ctx.stroke()
            }

            // Add support for other shape types
            if (shape.type === 'line' && shape.points && shape.points.length === 2) {
              ctx.beginPath()

              shape.points.forEach((point: any, index: number) => {
                const relativeX = (point.lng - bounds.west) / mapWidthInDegrees
                const relativeY = (bounds.north - point.lat) / mapHeightInDegrees

                const canvasX = relativeX * compositeCanvas.width
                const canvasY = relativeY * compositeCanvas.height

                if (index === 0) {
                  ctx.moveTo(canvasX, canvasY)
                } else {
                  ctx.lineTo(canvasX, canvasY)
                }
              })

              ctx.stroke()
            }

            if ((shape.type === 'rectangle' || shape.type === 'circle') && shape.points && shape.points.length > 2) {
              ctx.beginPath()

              shape.points.forEach((point: any, index: number) => {
                const relativeX = (point.lng - bounds.west) / mapWidthInDegrees
                const relativeY = (bounds.north - point.lat) / mapHeightInDegrees

                const canvasX = relativeX * compositeCanvas.width
                const canvasY = relativeY * compositeCanvas.height

                if (index === 0) {
                  ctx.moveTo(canvasX, canvasY)
                } else {
                  ctx.lineTo(canvasX, canvasY)
                }
              })

              ctx.closePath()
              ctx.stroke()
            }

          } catch (shapeError) {
            console.warn(`❌ Failed to render shape ${index}:`, shapeError)
          }
        })

        // Clean up the temporary overlay
        overlay.setMap(null)
        console.log('✅ All shapes re-rendered')
      }


      // Convert to data URL
      const dataUrl = compositeCanvas.toDataURL('image/jpeg', 0.95)

      console.log('✅ Composite image created')

      // Create PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      })

      // Get PDF page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Calculate image dimensions to fit the page
      const mapAspectRatio = mapWidth / mapHeight
      const pageAspectRatio = pageWidth / pageHeight

      let imgWidth, imgHeight, x, y

      if (mapAspectRatio > pageAspectRatio) {
        imgWidth = pageWidth
        imgHeight = pageWidth / mapAspectRatio
        x = 0
        y = (pageHeight - imgHeight) / 2
      } else {
        imgHeight = pageHeight
        imgWidth = pageHeight * mapAspectRatio
        x = (pageWidth - imgWidth) / 2
        y = 0
      }

      // Add image to PDF
      pdf.addImage(dataUrl, 'JPEG', x, y, imgWidth, imgHeight)

      // Add metadata
      pdf.setProperties({
        title: 'Rakugaki Map Export',
        subject: 'Map with drawings exported from Rakugaki Map',
        creator: 'Rakugaki Map Application',
        keywords: 'map, drawing, export'
      })

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const finalFilename = `${filename}_${timestamp}.pdf`

      // Save the PDF
      pdf.save(finalFilename)

      console.log(`✅ PDF exported successfully: ${finalFilename}`)

    } catch (error) {
      console.error('❌ PDF export failed:', error)

      let errorMessage = 'Export failed'
      if (error instanceof Error) {
        if (error.message.includes('tainted')) {
          errorMessage = 'Canvas security error - try refreshing the page'
        } else if (error.message.includes('CORS')) {
          errorMessage = 'Cross-origin error - some elements could not be captured'
        } else {
          errorMessage = error.message
        }
      }

      setExportError(errorMessage)
    } finally {
      setIsExporting(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setExportError(null)
  }, [])

  return {
    exportToPdf,
    isExporting,
    exportError,
    clearError
  }
}
