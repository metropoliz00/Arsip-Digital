import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // PENTING: base: './' memastikan aset dimuat secara relatif
  // Ini mencegah layar putih (blank screen) di GitHub Pages
  base: './',
})