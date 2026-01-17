
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base '/' berarti aplikasi berada di root domain/subdomain (misal: arsip.sekolah.id)
  base: '/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Kosongkan folder dist sebelum build baru agar tidak ada file sampah
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
  }
})
