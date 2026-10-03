
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    
    // Config Spécifique pour Tauri (Logiciel Bureau)
    server: {
      port: 1420,
      strictPort: true,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
    // Préfixes d'environnement pour Tauri
    envPrefix: ['VITE_', 'TAURI_'],

    resolve: {
      alias: {
        // Map native node modules to browser polyfills
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        assert: 'assert',
        buffer: 'buffer',
        process: 'process/browser',
        util: 'util',
        path: 'path-browserify',
        os: 'os-browserify',
        events: 'events',
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-markdown', 'lucide-react'],
            ai: ['@google/genai', 'dexie'],
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist', '@xenova/transformers'],
      include: ['buffer', 'process']
    },
    define: {
      'process.env': {
         API_KEY: JSON.stringify(env.API_KEY)
      }
    }
  };
});