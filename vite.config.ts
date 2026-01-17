
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base harus sesuai dengan nama folder di server-dir (deploy.yml)
  // Jika URL webnya arsip.uptsdnremen2.sch.id/arsip/ maka base: '/arsip/'
  base: '/arsip/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
  }
})
