import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT || '5173';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  define: (() => {
    // SUPABASE_URL secret may be set to the dashboard URL instead of the project API URL.
    // Derive the correct API URL from SUPABASE_DATABASE_URL which always has the right project ref.
    let supabaseApiUrl = process.env.SUPABASE_URL ?? '';
    if (!supabaseApiUrl.includes('.supabase.co') || supabaseApiUrl.includes('supabase.com/dashboard')) {
      const dbUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
      try {
        const host = new URL(dbUrl).hostname; // db.<ref>.supabase.co
        const ref = host.replace('db.', '').replace('.supabase.co', '');
        supabaseApiUrl = `https://${ref}.supabase.co`;
      } catch { /* fall back to empty */ }
    }
    return {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseApiUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY ?? ''),
    };
  })(),
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
