# Creating Custom Grayscale Map Styles

This guide explains how to create a custom grayscale map style for the rakugaki-map application using Google Cloud Console.

## Overview

Google Maps Platform supports cloud-based map styling, which allows you to create custom map appearances without modifying application code. Once created, map styles are referenced using Map IDs in your application.

## Prerequisites

- Access to Google Cloud Console with the rakugaki-map project
- Google Maps Platform APIs enabled (handled by Terraform)
- Project billing enabled

## Step-by-Step Instructions

### 1. Access Map Styles in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `rakugakimap-dev` or `the-rakugaki-map`
3. Navigate to **APIs & Services** > **Maps Platform** > **Map Styles**
   - Or search for "Map Styles" in the console search bar

### 2. Create a New Map Style

1. Click **Create Map Style** button
2. Choose **Create a style** (not import)
3. Select **JavaScript** as the platform
4. Give your style a descriptive name: `Rakugaki Grayscale Style`

### 3. Configure Grayscale Settings

In the style editor, apply these settings for a clean grayscale appearance:

#### Global Settings
- **Overall saturation**: Set to `-100` (removes all color)
- **Lightness**: Adjust to `+10` to `+20` for better visibility

#### Specific Feature Styling
Apply these to major feature categories:

**Roads:**
- **All roads**: Saturation `-100`, Lightness `0` to `+10`
- **Highways**: Saturation `-100`, Lightness `-10` (darker for contrast)

**Water:**
- **Water**: Saturation `-100`, Lightness `-20` (darker blue → dark gray)

**Landscape:**
- **Natural features**: Saturation `-100`, Lightness `+5`
- **Man-made features**: Saturation `-100`, Lightness `-5`

**POI (Points of Interest):**
- **All POI**: Saturation `-100`, reduce visibility to `50%` for cleaner look

**Labels:**
- **All labels**: Saturation `-100`, ensure good contrast

### 4. Preview and Test

1. Use the preview panel to test your style at different zoom levels
2. Test in different map locations (urban, rural, coastal)
3. Ensure text labels remain readable
4. Verify drawing visibility against the background

### 5. Create and Associate Map ID

1. Click **Publish** when satisfied with the style
2. Navigate to **Map IDs** section in Google Cloud Console
3. Click **Create Map ID**
4. Configure the Map ID:
   - **Map ID name**: `rakugaki-grayscale-map-{environment}`
   - **Map type**: `JavaScript`
   - **Description**: `Grayscale map style for rakugaki drawing app ({environment})`
5. **Associate your published style** with this Map ID

### 6. Update GitHub Variables

1. Copy the generated Map ID from Google Cloud Console
2. Update GitHub repository variables:

```bash
# For development environment
gh variable set MAP_ID_DEV --body "your-dev-map-id-here"

# For production environment
gh variable set MAP_ID_PROD --body "your-prod-map-id-here"
```

### 7. Update Local Development Environment

Update your `.env.local` file:

```bash
VITE_MAP_ID=your-dev-map-id-here
```

## Recommended Grayscale Style Settings

For optimal drawing visibility, consider these specific adjustments:

```json
{
  "elementType": "all",
  "stylers": [
    { "saturation": -100 },
    { "lightness": 15 }
  ]
},
{
  "featureType": "water",
  "stylers": [
    { "saturation": -100 },
    { "lightness": -25 }
  ]
},
{
  "featureType": "road",
  "stylers": [
    { "saturation": -100 },
    { "lightness": 5 }
  ]
}
```

## Testing Your Custom Map Style

1. Deploy the application with the new Map ID
2. Test drawing with different colors and tools
3. Verify rotation and tilt functionality still work
4. Check visibility across different zoom levels

## Troubleshooting

**Map doesn't load:**
- Verify the Map ID is correctly copied
- Ensure the Map ID is associated with your published style
- Check API key restrictions include the correct domains

**Style doesn't appear:**
- Confirm the style is published (not just saved as draft)
- Clear browser cache and reload
- Verify the Map ID is correctly associated

**Rotation/tilt not working:**
- Ensure the Map ID is configured for JavaScript platform
- Verify `renderingType: 'VECTOR'` is set in map options

## Benefits of Custom Map Styles

- **Consistent branding**: Match your application's visual design
- **Better drawing visibility**: Optimize background for drawing contrast
- **No code updates**: Change styles without redeploying application
- **Performance**: Cloud-based styles load efficiently

## Future Enhancements

Consider creating multiple map styles:
- **High contrast**: For accessibility
- **Night mode**: Dark theme with light drawings
- **Minimal**: Very clean with minimal features for focus on drawings

Each style can have its own Map ID and be switched programmatically or via user preference.

## Current Implementation

The application automatically uses the appropriate map ID based on the environment:
- **Local development**: Uses `VITE_MAP_ID` from `.env.local`
- **Development deployment**: Uses `MAP_ID_DEV` GitHub variable
- **Production deployment**: Uses `MAP_ID_PROD` GitHub variable
- **Fallback**: Uses demo map ID `8e0a97af9e0a7f95` if no environment variable is set
