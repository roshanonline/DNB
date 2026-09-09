import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pre-bundle all heavy deps so first page load does not trigger on-demand transforms
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'framer-motion',
      'chart.js',
      'react-chartjs-2',
      'lucide-react',
    ],
  },
  server: {
    port: 3000,
    // Warm up the most-visited routes so HMR transforms are cached on startup
    warmup: {
      clientFiles: [
        './src/App.jsx',
        './src/pages/Login.jsx',
        './src/pages/StudentDashboard.jsx',
        './src/pages/DepartmentDashboard.jsx',
        './src/pages/DepartmentProfile.jsx',
        './src/pages/AdminDashboard.jsx',
        './src/components/Navbar.jsx',
        './src/context/AuthContext.jsx',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
