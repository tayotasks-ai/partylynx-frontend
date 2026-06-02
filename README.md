# PartyLynx Frontend Client

The Vite-powered React + TypeScript + Tailwind CSS PWA client for PartyLynx.

## Features
- **Responsive Mobile Layout**: Specially styled and sized with a dark, premium glassmorphic UI.
- **Native Camera Access**: Uses device camera inputs with `<input type="file" accept="image/*" capture="environment" />` to snap photos on phone browsers without downloading an app.
- **Client-Side Compression**: Compresses photos to under 1MB using `browser-image-compression` to speed up cellular uploads.
- **Frictionless JWT Admission**: Stores zero-friction credentials in local storage automatically upon guest entry.
- **Custom Pull-to-Refresh**: Implements smooth native-like touch gestures to poll the backend database for new images since the last loaded timestamp.
- **Interactive Share Modal**: Generates QR codes on-the-fly and supports web share APIs.

## Tech Stack
- **Build Tool**: Vite
- **UI Library**: React (with TypeScript)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **QR Rendering**: QrCode.React

## Getting Started
1. Run `npm install`
2. Start the dev server: `npm run dev` (targets `http://localhost:5173/` and proxies `/api` and `/uploads` requests to the backend server at `http://localhost:5001`)
3. Compile production builds: `npm run build`
