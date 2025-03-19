import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import errorLoggerPlugin from './vite-plugin-error-logger';

// Check if SSL certificates exist for HTTPS
const sslKeyFile = path.resolve(__dirname, '../certs/key.pem');
const sslCertFile = path.resolve(__dirname, '../certs/cert.pem');

const httpsConfig = fs.existsSync(sslKeyFile) && fs.existsSync(sslCertFile)
  ? {
      key: fs.readFileSync(sslKeyFile),
      cert: fs.readFileSync(sslCertFile),
    }
  : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [errorLoggerPlugin()],
  server: {
    https: httpsConfig,
    port: 3000,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['three', 'urdf-loader'],
  },
});