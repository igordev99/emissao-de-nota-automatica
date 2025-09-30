import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar React e ReactDOM
          react: ['react', 'react-dom'],
          // Separar bibliotecas de UI grandes
          ui: ['@heroicons/react', 'lucide-react'],
          // Separar router
          router: ['react-router-dom'],
          // Separar bibliotecas utilitárias
          utils: ['axios', 'react-hook-form'],
          // Separar Supabase
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  }
})
