
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
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
