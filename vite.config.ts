import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Fallback para SPA: Vite maneja esto automáticamente para proyectos SPA.
    // No es necesario agregar historyApiFallback.
  },
});
