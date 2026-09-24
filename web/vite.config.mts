import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  build: {
    outDir: '../public',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'editor',
              test: /node_modules[\\/](@codemirror|@lezer|style-mod|w3c-keyname|crelt)/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/api-docs': 'http://localhost:3000',
    },
  },
});
