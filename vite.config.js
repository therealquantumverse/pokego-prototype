import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/pokego-prototype/, not a domain root.
  base: '/pokego-prototype/',
  plugins: [react()],
})
