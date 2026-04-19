import { defineConfig, Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Ordered list of source files — mirrors the original <script> order
 * from index.html. This is critical: files depend on globals declared
 * by earlier files.
 */
const SRC_ORDER = [
  'src/storage.ts',
  'src/state.ts',
  'src/utils.ts',
  'src/create-delete.ts',
  'src/smart-placement.ts',
  'src/layout.ts',
  'src/geometry.ts',
  'src/selection.ts',
  'src/edit.ts',
  'src/drag.ts',
  'src/input-mouse.ts',
  'src/input-touch.ts',
  'src/menus.ts',
  'src/link-mode.ts',
  'src/branch-view.ts',
  'src/mobile-rename.ts',
  'src/notes.ts',
  'src/trash.ts',
  'src/line-panel.ts',
  'src/ui.ts',
  'src/catalog.ts',
  'src/menu.ts',
  'src/map-bg.ts',
  'src/init.ts',
  'src/expose-globals.ts',
];

const VIRTUAL_ID = '\0integreco:app-bundle';

/**
 * Vite plugin that concatenates all source .ts files into a single
 * virtual module.  This preserves the original global-scope architecture:
 * every declaration shares one scope, exactly like the old multi-<script>
 * setup but with TypeScript support.
 */
function integrecoBundle(): Plugin {
  return {
    name: 'integreco-bundle',

    resolveId(id: string) {
      if (id === 'integreco:app-bundle') return VIRTUAL_ID;
      return null;
    },

    load(id: string) {
      if (id !== VIRTUAL_ID) return null;

      const chunks: string[] = [];
      for (const rel of SRC_ORDER) {
        const abs = path.resolve(__dirname, rel);
        if (!fs.existsSync(abs)) {
          // Fallback: try .js if .ts doesn't exist yet (during migration)
          const jsAbs = abs.replace(/\.ts$/, '.js');
          if (fs.existsSync(jsAbs)) {
            chunks.push(`// ===== ${rel.replace('.ts', '.js')} =====\n` + fs.readFileSync(jsAbs, 'utf-8'));
            continue;
          }
          console.warn(`[integreco-bundle] missing: ${rel}`);
          continue;
        }
        chunks.push(`// ===== ${rel} =====\n` + fs.readFileSync(abs, 'utf-8'));
      }
      return chunks.join('\n\n');
    },

    handleHotUpdate({ file, server }) {
      // Any change to a source file → invalidate the virtual module
      if (file.includes('/src/') && (file.endsWith('.ts') || file.endsWith('.js'))) {
        const mod = server.moduleGraph.getModuleById(VIRTUAL_ID);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      }
    },
  };
}

export default defineConfig({
  base: '/Integreco/',
  plugins: [integrecoBundle()],
  server: {
    port: 8080,
    host: '0.0.0.0',
    // hmr: false was disabling the client websocket, preventing full-reload
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
});
