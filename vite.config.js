import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    // Vercel sirve public/** por CDN cuando detecta la aplicación Express.
    outDir: 'public',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: false
      }
    }
  }
});
