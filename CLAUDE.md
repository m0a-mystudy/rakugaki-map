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

4. **Security Model**: Anonymous Authentication + Firestore Rules
   - Anonymous authentication enabled for edit permissions
   - Firestore rules: read access for everyone, write access for authenticated users only
   - Configured via Terraform for consistent deployment

### Component Relationships

```
App.tsx
├── GoogleMap (from @react-google-maps/api)
│   └── DrawingCanvas.tsx (custom overlay)
└── UI Controls (tools, colors, actions)
```

- **App.tsx**: Orchestrates all state, handles Firebase operations and authentication
- **DrawingCanvas.tsx**: Manages drawing logic and coordinate transformations
- **drawingService.ts**: Abstracts Firestore operations
- **firebase.ts**: Handles Firebase initialization and anonymous authentication

### Drawing Data Flow

1. User draws on canvas → Mouse events captured in pixel coordinates
2. Pixels converted to lat/lng using Google Maps projection
3. Shape objects created with geographic coordinates
4. On save: Anonymous authentication → Shape[] → Firestore document (with auth check)
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

### Security Implementation

The application implements a secure access model:

1. **Anonymous Authentication**: Automatically signs in users anonymously on first save
2. **Firestore Security Rules**: Enforced at database level
   ```javascript
   // drawings collection: read for everyone, write for authenticated users only
   match /drawings/{documentId} {
     allow read: if true;
     allow write: if request.auth != null;
   }
   ```
3. **Terraform Management**: All security settings deployed via Infrastructure as Code

### Deployment & Hosting

The application supports both manual and automated deployment to Firebase Hosting:

1. **CI/CD Pipeline**: GitHub Actions for automated deployment
   - Main branch push → Production deployment
   - Pull Request → Preview deployment (7-day expiry)
   - Automated security checks and build validation

2. **Firebase Hosting**: Configured via `firebase.json` for SPA routing and caching
3. **Manual deployment**: `scripts/deploy.sh` handles build and deployment
4. **API key restrictions**: Automatic domain restriction updates for production
5. **Environment separation**: dev/prod configurations with separate hosting URLs

### CI/CD Architecture

- **Workflow file**: `.github/workflows/deploy.yml`
- **Service account**: Firebase Admin access via GitHub Secrets
- **Security**: All credentials stored in GitHub Secrets
- **Preview deployments**: Temporary channels for PR review

### Current Limitations & Future Work

1. **No auto-save**: Users must manually click save
2. **No real-time collaboration**: Uses Firestore but not real-time listeners  
3. **Anonymous-only authentication**: Could add Google/GitHub login for persistent identity
4. **No drawing deletion**: Can only clear all or nothing
5. **Bundle size**: Firebase adds ~200KB to bundle

### Testing Approach

Currently no tests. When adding tests:
- Mock Google Maps API for DrawingCanvas tests
- Mock Firebase for service layer tests
- Focus on coordinate transformation logic as it's most complex