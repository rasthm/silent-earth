import { defineConfig } from 'vite';

// Relative base so the built game works from any host or subfolder (Workers, itch.io, GitHub Pages).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
