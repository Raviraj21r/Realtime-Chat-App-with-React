# Deployment Guide

## Environment Variables Configuration

### Frontend (Vite + React)

Create a `.env` file in the `frontend` directory:

```env
VITE_BACKEND_URL=https://your-backend-url.com
```

**Important**: 
- For Vercel deployment, set `VITE_BACKEND_URL` in Vercel environment variables
- The backend URL should be your deployed backend (e.g., Render, Railway, etc.)
- For local development, you can omit this variable (defaults to `http://localhost:3000`)

### Backend (Node.js + Express)

Create a `.env` file in the `backend` directory:

```env
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-strong-random-secret
CLIENT_URL=https://your-frontend-url.vercel.app
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Chatify
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
ARCJET_KEY=your-arcjet-key
ARCJET_ENV=production
```

## Deployment Platforms

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Add environment variable:
   - `VITE_BACKEND_URL`: Your deployed backend URL
4. Deploy

### Backend (Render/Railway)

1. Connect your GitHub repository to Render/Railway
2. Set root directory to `backend`
3. Add all environment variables from `.env.example`
4. Build command: `npm run build`
5. Start command: `npm start`
6. Deploy

## Socket.io Configuration

The application uses Socket.io for real-time features. Ensure:

1. **Backend CORS**: Your `CLIENT_URL` environment variable matches your frontend URL
2. **Frontend Socket URL**: `VITE_BACKEND_URL` must point to your backend URL
3. **Transports**: Both WebSocket and polling are enabled for maximum compatibility

## Common Issues

### Socket.io Not Working in Production

1. **Check CORS**: Ensure your backend CORS includes your frontend URL
2. **Check Backend URL**: Verify `VITE_BACKEND_URL` is set correctly
3. **Check Transport**: WebSocket may be blocked by some proxies - polling is enabled as fallback
4. **Check Credentials**: Ensure `withCredentials: true` is set in both axios and socket.io

### Cookies Not Working

1. Ensure `credentials: true` is set in CORS configuration
2. Ensure `withCredentials: true` is set in axios and socket.io
3. Check that your backend and frontend are on the same domain or properly configured for cross-origin cookies

## Testing Production Deployment

1. Test authentication flow (login/signup)
2. Test real-time messaging between two different browsers
3. Test online status indicators
4. Test message deletion and read receipts
5. Test status/story features
