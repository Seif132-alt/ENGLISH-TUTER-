import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/ENGLISH-TUTER-/', // اسم الريبو على GitHub بالضبط
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
