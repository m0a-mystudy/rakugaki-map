import '@testing-library/jest-dom'

// Mock Google Maps API
global.google = {
  maps: {
    LatLng: class MockLatLng {
      constructor(public lat: number, public lng: number) {}
      lat() { return this.lat }
      lng() { return this.lng }
    },
    Point: class MockPoint {
      constructor(public x: number, public y: number) {}
    },
    OverlayView: class MockOverlayView {
      setMap() {}
      getProjection() {
        return {
          fromLatLngToContainerPixel: (latLng: any) => ({ x: latLng.lng * 100, y: latLng.lat * 100 }),
          fromContainerPixelToLatLng: (point: any) => new (global.google.maps.LatLng)(point.y / 100, point.x / 100)
        }
      }
    },
    event: {
      trigger: () => {}
    }
  }
} as any
