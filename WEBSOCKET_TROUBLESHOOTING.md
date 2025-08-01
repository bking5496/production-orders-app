# WebSocket Troubleshooting Guide

## Quick Fix Deployment

To deploy the WebSocket enhancement fix:

```bash
sudo ./deploy-websocket-fix.sh
```

## Common Issues and Solutions

### 1. WebSocket Not Connecting

**Symptoms:**
- WebSocket debug shows "Disconnected" status
- Console errors about WebSocket connection failed

**Possible Causes & Solutions:**

#### A. Server Not Running
```bash
# Check if server is running
npx pm2 status

# If not running, start it
npx pm2 start server.js --name "production-app"
```

#### B. Port Issues
- Ensure port 3000 is open and accessible
- Check if reverse proxy (nginx) is configured correctly for WebSocket
- Verify WebSocket upgrade headers are being passed through

#### C. SSL/TLS Issues (Production)
- WebSocket connections on HTTPS sites need WSS (WebSocket Secure)
- Ensure SSL certificates are valid for WebSocket connections

### 2. Authentication Failures

**Symptoms:**
- Connection establishes but shows "auth_error"
- WebSocket debug shows "Authentication failed"

**Solutions:**

#### A. Check JWT Token
```bash
# Test authentication manually
node get-ws-token.js
```

#### B. Cookie Issues
- Ensure authentication cookies are being sent
- Check for SameSite cookie restrictions
- Verify domain matches between frontend and backend

#### C. Session Expiry
- Check if user session is still valid
- Re-login if session has expired

### 3. Build/Deployment Issues

**Symptoms:**
- Old WebSocket implementation still running
- Changes not reflected on website

**Solutions:**

#### A. Permission Issues
```bash
# Fix dist directory permissions
sudo chown -R production-app:production-app /home/production-app/production-orders-app/dist
```

#### B. Force Rebuild
```bash
# Remove old build and rebuild
sudo rm -rf dist
npm run build
```

#### C. Clear Browser Cache
- Hard refresh (Ctrl+F5)
- Clear browser cache and cookies
- Try incognito/private browsing mode

### 4. Reverse Proxy Configuration (nginx)

If using nginx, ensure WebSocket support:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 5. Firewall Issues

Ensure WebSocket connections are allowed:

```bash
# Check if port 3000 is open
sudo ufw status
sudo ufw allow 3000
```

## Debug Tools

### 1. WebSocket Debug Panel
- Added to the main app at bottom-right corner
- Shows connection status, metrics, and debug info
- Accessible via "WS" button or `?debug=websocket` URL parameter

### 2. Browser Console
```javascript
// Check if Enhanced WebSocket Service exists
console.log(window.EnhancedWebSocketService);

// Get connection status
console.log(window.EnhancedWebSocketService?.getConnectionStatus());

// Get metrics
console.log(window.EnhancedWebSocketService?.getMetrics());
```

### 3. Server Logs
```bash
# View PM2 logs
npx pm2 logs

# View specific app logs
npx pm2 logs production-app
```

### 4. Network Tab
- Open browser DevTools > Network tab
- Look for WebSocket connections (WS/WSS)
- Check for 101 Switching Protocols response

## Manual Testing

### 1. WebSocket Test Script
```bash
# Run automated test
node websocket-test.js
```

### 2. Browser Console Test
```javascript
// Manual WebSocket test
const ws = new WebSocket('wss://oracles.africa/ws?token=YOUR_TOKEN');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('Error:', error);
```

## Expected Behavior

When working correctly:

1. **WebSocket Debug Panel** shows:
   - Status: "Connected" (green)
   - WebSocket Support: ✅
   - Enhanced Service: ✅
   - Connection ID: Present
   - Subscriptions: Active channels

2. **Browser Console** shows:
   - `🔌 WebSocket Service initialized`
   - `✅ WebSocket connected successfully`
   - `🎉 WebSocket authentication successful`

3. **Real-time Updates**:
   - Order status changes appear instantly
   - Machine updates broadcast to all users
   - Dashboard statistics refresh automatically

## Contact Information

If issues persist:
1. Check server logs: `npx pm2 logs`
2. Enable debug mode: Visit site with `?debug=websocket`
3. Test with: `node websocket-test.js`
4. Review this troubleshooting guide

## Architecture Overview

```
Browser (React App)
    ↓ WSS/WS Connection
WebSocket Server (Enhanced)
    ↓ Authentication
JWT Token Validation
    ↓ Success
Channel Subscriptions
    ↓ Events
Real-time Broadcasting
```

## File Locations

- **Enhanced WebSocket Service**: `src/js/core/websocket-enhanced.js`
- **React Hooks**: `src/js/core/websocket-hooks.js`
- **Debug Component**: `src/js/components/websocket-debug.jsx`
- **Status Indicators**: `src/js/components/websocket-status.jsx`
- **Server WebSocket Handler**: `server.js` (lines 117-270)
- **Main App Integration**: `src/app.jsx`