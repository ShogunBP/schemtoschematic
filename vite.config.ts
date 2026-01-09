import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET?.trim() || 'http://localhost:3002';

  // Usar BUILD_TIMESTAMP e BUILD_VERSION do ambiente (passados pelo Docker)
  // Se não existirem, usar valores padrão (desenvolvimento local)
  const BUILD_TIMESTAMP = env.BUILD_TIMESTAMP || new Date().toISOString();
  const BUILD_VERSION = env.BUILD_VERSION || 'dev';
  
  const BUILD_DATE = new Date(BUILD_TIMESTAMP).toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  return {
    define: {
      __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
      __BUILD_DATE__: JSON.stringify(BUILD_DATE),
      __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
    },
    server: {
      host: "::",
      // Porta 8081 para dev local (8080 pode estar em uso pelo outro projeto)
      port: parseInt(process.env.VITE_PORT || '8081'),
      proxy: {
        '/convert': {
          target: proxyTarget, // Backend configurável via VITE_PROXY_TARGET
          changeOrigin: true,
          rewrite: (path) => path,
        },
        '/conversion-logs': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: './index.html'
        }
      }
    },
  };
});
