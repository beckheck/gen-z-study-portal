# Extension Loading Guide

## Loading the Extension

1. **Open Chrome** and navigate to `chrome://extensions/`

2. **Enable Developer Mode** by clicking the toggle in the top right

3. **Click "Load unpacked"** and select the folder:

   ```plain
   /Users/rstuven/dev/gen-z-study-portal/.output/chrome-mv3
   ```

4. The extension should now appear in your extensions list!

## Testing Different Modes

### 🔹 **Popup Mode**

- Click the extension icon in Chrome's toolbar to open the popup view (400x600px)

### 🔹 **Side Panel Mode**

- Right-click the extension icon and select "Open side panel"
- Or use the Chrome side panel toggle to access it

### 🔹 **New Tab Mode**

- Open a new tab in Chrome to see the full StudyHub ✨ interface

### 🔹 **Content Script/Overlay Mode**

- Visit any website and press `Ctrl+Shift+S` to toggle the StudyHub ✨ overlay
- Or right-click on any page and use "Quick Study Access" from the context menu

## Development

### Building for Production

```bash
npm run build:ext
```

### Development Mode

```bash
npm run dev:ext
```

### Regular Web App (for comparison)

```bash
npm run dev
```

## Extension Features

✅ **Unlimited Storage** - Uses IndexedDB through Chrome extension APIs  
✅ **Cross-Browser Ready** - Built with WXT framework  
✅ **Multiple Access Points** - Popup, side panel, new tab, overlay  
✅ **Context Menu Integration** - Right-click access on any webpage  
✅ **Keyboard Shortcuts** - Quick access via Ctrl+Shift+S  
✅ **Responsive Design** - Adapts UI for different extension contexts  

## File Structure

```plain
.output/chrome-mv3/          # Built extension files
├── manifest.json            # Extension manifest
├── popup.html              # Popup interface
├── sidepanel.html          # Side panel interface  
├── newtab.html             # New tab replacement
├── background.js           # Service worker
├── content-scripts/        # Content script for web pages
└── chunks/                 # Bundled JavaScript & CSS
```

The extension preserves all your original functionality while adding browser extension superpowers! 🚀
