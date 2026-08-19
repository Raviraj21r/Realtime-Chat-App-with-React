# PWA Setup Guide for Chatify

## Overview
Chatify now supports Progressive Web App (PWA) features, allowing users to install it directly from their mobile browser as a native-like app.

## Features Added

### 1. **Manifest Configuration** (`public/manifest.json`)
- App name: "Chatify - Realtime Chat App"
- Short name: "Chatify"
- Standalone display mode (no browser UI)
- Custom app icon
- Theme color matching app design
- Portrait orientation for mobile
- App shortcuts for quick access

### 2. **Service Worker** (`public/sw.js`)
- Caches static assets for offline access
- Network-first strategy for API calls
- Automatic cache cleanup
- Background sync support

### 3. **Vite PWA Plugin** (`vite.config.js`)
- Automatic service worker generation
- Auto-update functionality
- Workbox integration for advanced caching
- Runtime caching for API requests

### 4. **HTML Enhancements** (`index.html`)
- PWA manifest link
- Apple touch icon support
- Theme color meta tag
- Mobile viewport optimization
- Service worker registration

## Installation Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Development Mode
```bash
npm run dev
```
The PWA features work in development mode but are limited.

### 3. Production Build
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```
This is the best way to test PWA installation features.

## How Users Install the App

### On Android (Chrome)
1. Open the app in Chrome browser
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. Confirm installation

### On iOS (Safari)
1. Open the app in Safari browser
2. Tap the share button
3. Scroll down and tap "Add to Home Screen"
4. Confirm installation

### On Desktop (Chrome/Edge)
1. Open the app in Chrome or Edge
2. Look for the install icon in the address bar
3. Click "Install"
4. Confirm installation

## PWA Features

### Offline Support
- Static assets are cached automatically
- App works without internet connection
- API requests use network-first strategy

### App-like Experience
- Full-screen mode (no browser UI)
- Custom app icon on home screen
- Splash screen with theme color
- Smooth transitions and animations

### Automatic Updates
- Service worker checks for updates
- New versions download in background
- Updates applied on next app launch

## Testing PWA

### Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section
4. Verify "Service Workers" section
5. Test "Add to Home Screen" simulation

### Lighthouse Audit
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Run audit
5. Check PWA score (aim for 90+)

## Customization

### Change App Icon
Replace `public/app-icon.svg` with your custom icon (512x512px recommended).

### Change Theme Color
Update `theme_color` in both:
- `public/manifest.json`
- `vite.config.js`
- `index.html` (meta tag)

### Change App Name
Update `name` and `short_name` in:
- `public/manifest.json`
- `vite.config.js`
- `index.html` (title tag)

## Troubleshooting

### Service Worker Not Registering
- Ensure HTTPS is used (required for PWA)
- Check browser console for errors
- Verify service worker file path

### Install Prompt Not Showing
- Ensure user has interacted with the app
- Check if already installed
- Verify manifest is valid
- Use HTTPS or localhost

### Cache Issues
- Clear browser cache
- Unregister service worker in DevTools
- Rebuild the app

## Production Deployment

### Requirements
- HTTPS is mandatory (except localhost)
- Proper MIME types for manifest and service worker
- Service worker must be served from root

### Build Commands
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy the 'dist' folder to your hosting
```

## Additional Resources
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin Docs](https://vite-plugin-pwa.netlify.app/)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
