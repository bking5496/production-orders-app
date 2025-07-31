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
      '.oracles.africa' // Allow all subdomains
    ],
    // This proxy forwards API requests to your backend server
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
