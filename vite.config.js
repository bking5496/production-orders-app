import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This makes the server accessible over your network
    port: 5173,
    allowedHosts: [
      'oracles.africa',
      'www.oracles.africa',
      'localhost',
      '197.85.7.242',
      '.oracles.africa' // Allow all subdomains
    ],
    // Ignore requests for common security scanner targets
    middlewareMode: false,
    fs: {
      strict: true,
      deny: ['**/.env', '**/package.json', '**/node_modules/**']
    },
    // This proxy forwards API requests to your backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('API proxy error:', err);
          });
        },
      },
      // Handle malformed /apis/ requests by redirecting to /api/
      '/apis': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/apis/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('APIs proxy error:', err);
          });
        },
      },
    },
  },
});
