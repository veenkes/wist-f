import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Extract base URL without /api suffix for proxy target
  const apiBaseUrl = env.VITE_API_BASE_URL || 'https://dalton-bountyless-untamely.ngrok-free.dev/api';
  const proxyTarget = apiBaseUrl.replace(/\/api$/, '');

  return {
    server: {
      host: '::',
      port: 8080,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
