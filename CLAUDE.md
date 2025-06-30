# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev                # Start development server (Vite) at http://localhost:5173
npm run dev:host           # Start dev server accessible from network (--host)
npm run dev:emulator       # Start Firestore emulator only
npm run dev:with-emulator  # Start dev server with Firestore emulator
npm run dev:emulator-host  # Start dev server with emulator accessible from network
npm run build              # Run TypeScript check and build for production
npm run preview            # Preview production build locally
```

## Architecture Overview

This is a map-based drawing application where users can draw on Google Maps and share their drawings via URL. The architecture requires coordination between Google Maps API, Canvas drawing, and Firebase data persistence.

### Key Architectural Decisions

1. **Drawing Implementation**: Uses Google Maps OverlayView with HTML Canvas
   - Drawing coordinates are stored as lat/lng pairs, not pixels
   - This ensures drawings remain in the correct position when map moves/zooms
   - Advanced pen pressure support for iPad Pencil and other stylus devices
   - Multi-touch handling with Pointer API for optimal device compatibility
   - Vector map rendering enabled with rotation and tilt capabilities
   - See `DrawingCanvas.tsx` for the coordinate transformation logic

2. **State Management**: Modular React Hooks (no Redux/Context)
   - Refactored to custom hooks for separation of concerns
   - Drawing data flows: useDrawingCanvas → useDrawing → Firebase
   - URL parameter (`?id=xxx`) drives the shared drawing ID
   - Map state (center, zoom) is tracked for saving/loading views
   - **Custom Hooks Architecture**:
     - `useMap`: Map controls, geolocation, rotation/tilt management
     - `useDrawing`: Drawing state, auto-save logic, Firebase operations
     - `useDrawingCanvas`: Canvas events, shape creation, drawing interactions
     - `useMenu`: UI menu positioning and minimization state
     - `useAuthManager`: Firebase authentication management

3. **Data Persistence**: Firebase Firestore with Smart Auto-Save
   - Collection: `drawings`
   - Each drawing has a random ID used in the share URL
   - **Delayed Auto-Save**: 1-second delay after drawing stops
   - **Smart Saving**: Skips saves during continuous drawing activities
   - Triggers save when drawing mode ends to ensure data integrity

4. **Security Model**: Anonymous Authentication + Firestore Rules
   - Anonymous authentication enabled for edit permissions
   - Firestore rules: read access for everyone, write access for authenticated users only
   - Configured via Terraform for consistent deployment

### Component Relationships

```
App.tsx (296 lines, 50% reduction from refactoring)
├── Custom Hooks Integration
│   ├── useAuthManager (Firebase auth)
│   ├── useMap (map controls & state)
│   ├── useDrawing (drawing state & auto-save)
│   └── useMenu (UI positioning)
├── GoogleMap (from @react-google-maps/api)
│   └── DrawingCanvas.tsx (refactored with useDrawingCanvas)
└── UI Controls (tools, colors, actions)
```

**File Structure**:
- **App.tsx**: Orchestrates custom hooks, minimal state management (296 lines vs 597 original)
- **DrawingCanvas.tsx**: Canvas rendering with useDrawingCanvas hook integration
- **hooks/**: Modular state management with comprehensive test coverage (61 tests)
  - `useMap.ts`: Map controls, geolocation, rotation/tilt (141 lines)
  - `useDrawing.ts`: Drawing state, delayed auto-save logic (147 lines)
  - `useDrawingCanvas.ts`: Canvas events, shape creation (378 lines)
  - `useMenu.ts`: UI menu state (30 lines)
  - `useAuthManager.ts`: Firebase authentication (existing)
- **constants/**: Extracted configuration constants
  - `drawing.ts`: Color palette and drawing defaults
  - `googleMaps.ts`: Map configuration and libraries
- **services/**: Firebase integration layer
  - `drawingService.ts`: Abstracts Firestore operations
  - `firebase.ts`: Firebase initialization and anonymous authentication

### Drawing Data Flow

1. **Input Events**: User draws on canvas → `useDrawingCanvas` captures Pointer/Touch/Mouse events with pressure data
2. **Coordinate Transformation**: Pixels converted to lat/lng using Google Maps projection
3. **Shape Creation**: Shape objects created with geographic coordinates and pressure information
4. **Rendering**: Pressure-sensitive rendering with dynamic line width based on stylus pressure
5. **Auto-Save Logic**:
   - Skip saves during continuous drawing (`isDrawing = true`)
   - Trigger 1-second delayed save after drawing stops
   - Ensure save when drawing mode ends
6. **Persistence**: Anonymous authentication → Shape[] → Firestore document (with auth check)
7. **Loading**: Firestore → Shape[] → Canvas redraw with lat/lng → pixel conversion
8. **Map Controls**: `useMap` handles rotation (45° increments), tilt adjustment (0-67.5°), reset functions

### Environment Setup Requirements

The app requires both Google Maps API and Firebase configuration:

```bash
# .env.local (create this file - it's gitignored)
VITE_GOOGLE_MAPS_API_KEY=xxx
VITE_MAP_ID=xxx                        # Google Maps style ID for grayscale rendering
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

**Getting Environment Variables**:
- **Google Maps API Key**: Get from Terraform output
  ```bash
  cd terraform/environments/dev && terraform output -raw api_key
  ```
- **Firebase Configuration**: Get from Secret Manager
  ```bash
  gcloud secrets versions access latest --secret="firebase-api-key-dev"  # pragma: allowlist secret
  gcloud secrets versions access latest --secret="firebase-auth-domain-dev"  # pragma: allowlist secret
  # etc. for other Firebase config values
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
3. **Infrastructure Management**: Hybrid approach with Terraform and manual management
   - Terraform manages: API services, Firestore database, security rules, authentication config
   - Manual management: WIF, Secret Manager, state buckets (see `terraform/INFRASTRUCTURE_MANAGEMENT.md`)

### Deployment & Hosting

The application supports both manual and automated deployment to Firebase Hosting:

1. **CI/CD Pipeline**: GitHub Actions for automated deployment
   - Main branch push → Development deployment (rakugakimap-dev.web.app)
   - Tag v*.*.* push → Production deployment (the-rakugaki-map.web.app)
   - Pull Request → Preview deployment (7-day expiry)
   - Automated security checks and build validation

2. **Firebase Hosting**: Configured via `firebase.json` for SPA routing and caching
3. **Manual deployment**: `scripts/deploy.sh` handles build and deployment
4. **API key restrictions**: Automatic domain restriction updates for production
5. **Environment separation**: dev/prod configurations with separate hosting URLs

### CI/CD Architecture

- **Workflow files**:
  - `.github/workflows/deploy.yml` - Application deployment
  - `.github/workflows/terraform.yml` - Infrastructure management
- **Authentication**: Workload Identity Federation (keyless authentication)
- **Service accounts**:
  - `github-actions-wif@rakugakimap-dev.iam.gserviceaccount.com`
  - `github-actions-wif@the-rakugaki-map.iam.gserviceaccount.com`
- **Security**: All credentials stored in Secret Manager (no GitHub Secrets)
- **Preview deployments**: Temporary channels for PR review

**Environment Configuration**:
- **Development**: `rakugakimap-dev` project
- **Production**: `the-rakugaki-map` project
- **State Management**: Separate GCS buckets for Terraform state
- **Secret Access**: Direct via WIF and `gcloud secrets versions access`

### Current Features & Limitations

**✅ Implemented Features**:
- **Drawing Capabilities**:
  - Pen pressure sensitivity for iPad Pencil and compatible stylus devices
  - Multi-touch gesture handling with Pointer API prioritization
  - Multiple drawing tools: pen, line, rectangle, circle, eraser
  - Pressure-sensitive rendering with dynamic line width
- **Map Controls**:
  - Map rotation controls (45° increments) with visual compass reset
  - Map tilt adjustment (0-67.5°) with up/down controls and flat reset
  - Vector map rendering with custom grayscale styling
  - Geolocation integration with map centering
- **User Interface**:
  - Draggable floating control panel for better UX
  - Menu position switching (right/top) and minimization
  - Color palette and line width controls
- **Data Management**:
  - Smart auto-save with 1-second delay after drawing stops
  - Skips saves during continuous drawing for better performance
  - Anonymous authentication with automatic sign-in
  - URL-based drawing sharing with unique IDs
- **Development & Testing**:
  - Comprehensive test suite (61+ tests) for custom hooks
  - Firestore emulator support for local development
  - Modular architecture with custom React hooks

**⚠️ Current Limitations**:
1. **No real-time collaboration**: Uses Firestore but not real-time listeners
2. **Anonymous-only authentication**: Could add Google/GitHub login for persistent identity
3. **No drawing deletion**: Can only clear all or nothing
4. **Bundle size**: Firebase adds ~200KB to bundle

### Testing Approach

**Testing Framework**: Vitest with React Testing Library

**Available Commands**:
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

**Current Test Coverage**: 61+ tests across multiple modules
- ✅ **Custom Hooks**: Comprehensive test coverage for all custom hooks
  - `useMap.test.ts`: Map controls, geolocation, rotation/tilt (27 tests)
  - `useMenu.test.ts`: Menu positioning and state management (6 tests)
  - `useAuthManager.test.ts`: Firebase authentication flows (7+ tests)
- ✅ **Utilities**: Core logic and calculations
  - `coordinateUtils.test.ts`: Geographic calculations and transformations (17 tests)
  - `mapUtils.test.ts`: Google Maps integration and controls (24 tests)
- 🚧 **Component tests**: Planned for DrawingCanvas and App components
- 🚧 **Service layer tests**: Planned for Firebase integration

**Test Structure**:
```
src/
├── test/setup.ts                    # Test configuration and mocks
├── hooks/__tests__/                 # Custom hooks test suite
│   ├── useMap.test.ts              # Map state management (27 tests)
│   ├── useMenu.test.ts             # UI menu controls (6 tests)
│   └── useAuthManager.test.ts      # Firebase auth (7+ tests)
├── utils/__tests__/                 # Utility functions
│   ├── coordinateUtils.test.ts     # Geographic calculations (17 tests)
│   └── mapUtils.test.ts            # Map controls (24 tests)
└── components/__tests__/           # Component tests (planned)
```

**Mocking Strategy**:
- **Google Maps API**: Mocked in test setup with simplified projection
- **Firebase**: Manual mocks for authentication and Firestore operations
- **Custom Hooks**: Isolated testing with mocked dependencies
- **Environment**: Handled via vitest.config.ts

## Infrastructure Management

### Current Approach

This project uses a **hybrid infrastructure management approach**:

**Terraform Managed (14 resources)**:
- API services (Maps, Firebase, Firestore, Identity Toolkit)
- Google Maps API key with domain restrictions
- Firestore database and security rules
- Firebase Authentication configuration

**Manually Managed (Security Foundations)**:
- Terraform state buckets (circular dependency avoidance)
- Workload Identity Federation resources (security separation)
- Secret Manager secrets and versions (security)

### Key Commands

**Infrastructure Deployment**:
```bash
# Development
cd terraform/environments/dev
terraform init && terraform apply

# Production
cd terraform/environments/prod
terraform init && terraform apply
```

**Get Environment Variables**:
```bash
# API Key from Terraform
terraform output -raw api_key

# Firebase config from Secret Manager
gcloud secrets versions access latest --secret="firebase-api-key-dev"  # pragma: allowlist secret
```

**Security and Quality Commands**:
```bash
npm run security:scan       # Run detect-secrets scan for sensitive data
npm run security:all        # Run all security scans
npm run precommit           # Run pre-commit hooks on all files
npm run firestore:rules     # Deploy Firestore security rules only
```

**Manual Resource Management**:
- See `terraform/STATE_BUCKET_MANAGEMENT.md` for state bucket operations
- See `terraform/SECRET_MANAGEMENT.md` for secret operations
- See `terraform/INFRASTRUCTURE_MANAGEMENT.md` for complete overview

### Architecture Benefits

- **Security**: Authentication infrastructure isolated from application infrastructure
- **Safety**: CI/CD cannot modify its own security foundations
- **Maintainability**: Clear separation of automated vs. manual management
- **Debugging**: Obvious responsibility boundaries

## Development Workflow

### Branch Strategy
- **main branch**: Auto-deploy to development environment
- **tags (v*.*.*)**: Auto-deploy to production environment
- **Pull Requests**: Create preview environments (7-day expiry)

### Environment Flow
```
Feature Branch → Pull Request → Preview Environment
     ↓              ↓
main branch → Development (rakugakimap-dev.web.app)
     ↓
Tag v*.*.* → Production (the-rakugaki-map.web.app)
```

### Infrastructure Changes
**Terraform Resources (Application Infrastructure)**:
```bash
# 1. Test in development
cd terraform/environments/dev
terraform plan && terraform apply

# 2. Commit changes
git add terraform/ && git commit -m "feat: update infrastructure"

# 3. Apply to production
cd terraform/environments/prod
terraform plan && terraform apply
```

**Manual Resources (Security Foundations)**:
- State buckets: Manual GCS operations
- WIF: Manual gcloud commands with careful testing
- Secrets: Manual Secret Manager operations
- See detailed docs in terraform/ directory

### Deployment Commands
```bash
# Development deployment
git push origin main  # Auto-triggers CI/CD

# Production deployment
git tag v1.0.0 && git push origin v1.0.0  # Auto-triggers CI/CD

# Manual deployment (if needed)
npm run deploy:dev
npm run deploy:prod
```

### Troubleshooting
1. **CI/CD failures**: Check GitHub Actions logs for WIF/permissions issues
2. **Infrastructure issues**: Check Terraform state and manual resource status
3. **Deployment issues**: Verify Firebase project settings and domain restrictions

**Key Reference**: See [WORKFLOW.md](WORKFLOW.md) for complete development and operational procedures.
