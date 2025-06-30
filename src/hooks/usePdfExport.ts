import { useState, useCallback } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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
      quality = 1.0,
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
        const mapCenter = { lat: mapState.center.lat(), lng: mapState.center.lng() }
        const zoom = Math.round(mapState.zoom)

        console.log('🎯 Using current screen view for PDF export:', {
          center: mapCenter,
          zoom: zoom
        })

        const center = `${mapCenter.lat},${mapCenter.lng}`

        // Calculate map size based on container aspect ratio
        const aspectRatio = mapWidth / mapHeight
        let staticWidth, staticHeight

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
        const mapScale = 2 // 2x for high DPI

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

      // Re-render drawings on top of the map
      if (shapes && shapes.length > 0 && mapState) {
        console.log(`🎨 Re-rendering ${shapes.length} shapes...`)

        const zoom = Math.round(mapState.zoom)
        const centerLat = mapState.center.lat()
        const centerLng = mapState.center.lng()

        // Web Mercator projection functions
        const lngToX = (lng: number, zoom: number) => {
          return ((lng + 180) / 360) * Math.pow(2, zoom) * 256
        }

        const latToY = (lat: number, zoom: number) => {
          const latRad = lat * Math.PI / 180
          return (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom) * 256
        }

        // Calculate center in pixel coordinates
        const centerX = lngToX(centerLng, zoom)
        const centerY = latToY(centerLat, zoom)

        // Calculate pixel size of the visible area
        // At zoom level z, the world is 256 * 2^z pixels wide
        const worldPixelWidth = 256 * Math.pow(2, zoom)

        // Calculate meters per pixel at this latitude and zoom
        const metersPerPixel = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom)

        // Approximate the pixel dimensions of our canvas at this zoom level
        // This is an approximation based on typical Google Maps behavior
        const mapPixelWidth = compositeCanvas.width / scale
        const mapPixelHeight = compositeCanvas.height / scale

        shapes.forEach((shape, index) => {
          try {
            ctx.strokeStyle = shape.color || '#ff0000'
            ctx.lineWidth = (shape.width || 2) * scale
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            if (shape.type === 'pen' && shape.points && shape.points.length > 1) {
              ctx.beginPath()

              shape.points.forEach((point, pointIndex) => {
                // Convert lat/lng to pixel coordinates
                const pointX = lngToX(point.lng, zoom)
                const pointY = latToY(point.lat, zoom)

                // Calculate offset from center
                const offsetX = pointX - centerX
                const offsetY = pointY - centerY

                // Convert to canvas coordinates
                const canvasX = (compositeCanvas.width / 2) + offsetX * scale
                const canvasY = (compositeCanvas.height / 2) + offsetY * scale

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

              // Convert start point
              const startX = lngToX(shape.points[0].lng, zoom)
              const startY = latToY(shape.points[0].lat, zoom)
              const startOffsetX = startX - centerX
              const startOffsetY = startY - centerY
              const startCanvasX = (compositeCanvas.width / 2) + startOffsetX * scale
              const startCanvasY = (compositeCanvas.height / 2) + startOffsetY * scale

              // Convert end point
              const endX = lngToX(shape.points[1].lng, zoom)
              const endY = latToY(shape.points[1].lat, zoom)
              const endOffsetX = endX - centerX
              const endOffsetY = endY - centerY
              const endCanvasX = (compositeCanvas.width / 2) + endOffsetX * scale
              const endCanvasY = (compositeCanvas.height / 2) + endOffsetY * scale

              ctx.moveTo(startCanvasX, startCanvasY)
              ctx.lineTo(endCanvasX, endCanvasY)
              ctx.stroke()
            }

            if ((shape.type === 'rectangle' || shape.type === 'circle') && shape.points && shape.points.length > 2) {
              ctx.beginPath()

              shape.points.forEach((point, index) => {
                const pointX = lngToX(point.lng, zoom)
                const pointY = latToY(point.lat, zoom)
                const offsetX = pointX - centerX
                const offsetY = pointY - centerY
                const canvasX = (compositeCanvas.width / 2) + offsetX * scale
                const canvasY = (compositeCanvas.height / 2) + offsetY * scale

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
