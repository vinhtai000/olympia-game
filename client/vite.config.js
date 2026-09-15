import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind to 0.0.0.0 so other devices on the same WiFi/LAN can open the
    // dev server too (needed for real multiplayer testing across devices).
    host: true
  }
});
