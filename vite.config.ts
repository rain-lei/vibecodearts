import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/vibecodearts/',
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
