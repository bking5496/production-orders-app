#!/bin/bash

echo "🚀 Deploying WebSocket Enhancement Fix"
echo "======================================"

# Check if running as root/sudo
if [ "$EUID" -eq 0 ]; then
    echo "✅ Running with proper permissions"
else
    echo "❌ This script needs to be run with sudo"
    echo "Usage: sudo ./deploy-websocket-fix.sh"
    exit 1
fi

# Remove old dist directory
echo "🗑️ Removing old build files..."
rm -rf /home/production-app/production-orders-app/dist

# Change to project directory
cd /home/production-app/production-orders-app

# Build the project
echo "🔨 Building frontend..."
sudo -u production-app npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Restart PM2 process
echo "🔄 Restarting PM2 processes..."
sudo -u production-app npx pm2 restart all

# Show PM2 status
echo "📊 PM2 Status:"
sudo -u production-app npx pm2 status

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 To verify WebSocket is working:"
echo "1. Visit https://oracles.africa/"
echo "2. Look for the WebSocket debug panel (WS button in bottom right)"
echo "3. Check if status shows 'Connected' with green indicator"
echo ""
echo "🐛 Troubleshooting:"
echo "- Check browser console for any WebSocket errors"
echo "- Visit https://oracles.africa/?debug=websocket for detailed debug info"
echo "- Check PM2 logs: pm2 logs"