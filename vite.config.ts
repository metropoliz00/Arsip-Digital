
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // KEMBALI KE ROOT: Gunakan '/' agar website tampil langsung di arsip.uptsdnremen2.sch.id
  base: '/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Menggunakan default esbuild agar lebih stabil tanpa dependensi tambahan
    minify: 'esbuild',
  }
})
