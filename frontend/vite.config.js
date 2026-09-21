import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/curriculum': 'http://127.0.0.1:8000',
      '/scan': 'http://127.0.0.1:8000',
      '/ask': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/check-answer': 'http://127.0.0.1:8000',
      '/generate-lesson': 'http://127.0.0.1:8000',
      '/generate-plan': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    }
  }
})
