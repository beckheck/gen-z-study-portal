import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  publicDir: 'public',

  // Disable pre-rendering for HTML entry points to avoid DOM issues
  analysis: {
    enabled: false,
  },

  // Import your existing Vite config settings
  vite: () => ({
    css: {
      postcss: './postcss.config.js', // Your existing PostCSS config
    },
    resolve: {
      alias: {
        '@': '/src', // Path aliases for cleaner imports
      },
    },
    define: {
      // Ensure browser environment detection works
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
  }),

  manifest: {
    name: 'StudyHub ✨',
    version: '0.1.0',
    description: 'Study portal · Local-first · Private · Cute af',
    permissions: [
      'storage',
      'unlimitedStorage',
      'activeTab',
      'sidePanel',
      'contextMenus',
      'alarms',
      'scripting',
      'offscreen',
      'notifications',
      // 'file://*/*',
    ],
    commands: {
      'open-in-tab': {
        suggested_key: {
          default: 'Ctrl+Shift+T',
          mac: 'Command+Shift+T',
        },
        description: 'Open StudyHub ✨ in new tab',
      },
    },
    icons: {
      96: 'hearticon.png',
    },
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [
      {
        resources: ['*.js', '*.css', 'assets/*', '*.html'],
        matches: ['<all_urls>'],
      },
    ],
  },

  // Use webExt instead of runner (deprecated)
  // webExt: {
  //   startUrls: ['chrome://extensions/'], // For testing content scripts
  // },
});
