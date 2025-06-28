# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server (Vite) at http://localhost:5173
npm run build    # Run TypeScript check and build for production
npm run preview  # Preview production build locally
```

## Architecture Overview

This is a map-based drawing application where users can draw on Google Maps and share their drawings via URL. The architecture requires coordination between Google Maps API, Canvas drawing, and Firebase data persistence.

### Key Architectural Decisions

1. **Drawing Implementation**: Uses Google Maps OverlayView with HTML Canvas
   - Drawing coordinates are stored as lat/lng pairs, not pixels
   - This ensures drawings remain in the correct position when map moves/zooms
   - See `DrawingCanvas.tsx` for the coordinate transformation logic

2. **State Management**: Local React state (no Redux/Context)
   - Drawing data flows: DrawingCanvas → App → Firebase
   - URL parameter (`?id=xxx`) drives the shared drawing ID
   - Map state (center, zoom) is tracked for saving/loading views

3. **Data Persistence**: Firebase Firestore
   - Collection: `drawings`
   - Each drawing has a random ID used in the share URL
   - No real-time sync yet - manual save button only

### Component Relationships

```
App.tsx
├── GoogleMap (from @react-google-maps/api)
│   └── DrawingCanvas.tsx (custom overlay)
└── UI Controls (tools, colors, actions)
```

- **App.tsx**: Orchestrates all state, handles Firebase operations
- **DrawingCanvas.tsx**: Manages drawing logic and coordinate transformations
- **drawingService.ts**: Abstracts Firestore operations

### Drawing Data Flow

1. User draws on canvas → Mouse events captured in pixel coordinates
2. Pixels converted to lat/lng using Google Maps projection
3. Shape objects created with geographic coordinates
4. On save: Shape[] → Firestore document
5. On load: Firestore → Shape[] → Canvas redraw with lat/lng → pixel conversion

### Environment Setup Requirements

The app requires both Google Maps API and Firebase configuration:

```bash
# .env.local (create this file - it's gitignored)
VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

Without these, the app will load but maps won't display and saving won't work.

### Current Limitations & Future Work

1. **No auto-save**: Users must manually click save
2. **No real-time collaboration**: Uses Firestore but not real-time listeners
3. **No user authentication**: Auth is configured but not implemented
4. **No drawing deletion**: Can only clear all or nothing
5. **Bundle size**: Firebase adds ~200KB to bundle

### Testing Approach

Currently no tests. When adding tests:
- Mock Google Maps API for DrawingCanvas tests
- Mock Firebase for service layer tests
- Focus on coordinate transformation logic as it's most complex