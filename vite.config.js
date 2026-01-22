import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/bigtwo',
    rollupOptions: {
      input: {
        main: './bigtwo.html'
      }
    }
  },
  publicDir: false
});
