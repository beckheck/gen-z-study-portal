import { browser } from 'wxt/browser';

// Helper function to get extension URLs cross-browser
const getExtensionURL = (path: string): string => {
  const runtime = globalThis.browser?.runtime || globalThis.chrome?.runtime;
  return runtime ? runtime.getURL(path) : path;
};

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    class StudyPortalContentScript {
      private overlayActive: boolean = false;

      constructor() {
        this.setupEventListeners();
      }

      setupEventListeners() {
        // Keyboard shortcut: Ctrl+Shift+S to toggle overlay
        document.addEventListener('keydown', e => {
          if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            this.toggleStudyOverlay();
          }
        });

        // Handle text selection for saving to StudyHub ✨
        document.addEventListener('mouseup', e => {
          const selection = window.getSelection()?.toString().trim();
          if (selection && selection.length > 0) {
            this.handleTextSelection(selection);
          }
        });

        // Listen for messages from extension
        browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
          if (request.action === 'captureSelection') {
            this.captureCurrentSelection();
          } else if (request.action === 'toggleOverlay') {
            this.toggleStudyOverlay();
          }
          sendResponse({ success: true });
        });
      }

      handleTextSelection(text: string) {
        // Send selected text to extension background
        browser.runtime.sendMessage({
          action: 'textSelected',
          text: text,
          url: window.location.href,
          title: document.title,
          timestamp: Date.now(),
        });
      }

      captureCurrentSelection() {
        const selection = window.getSelection()?.toString().trim();
        if (selection) {
          this.handleTextSelection(selection);
        }
      }

      toggleStudyOverlay() {
        if (this.overlayActive) {
          this.removeOverlay();
        } else {
          this.createOverlay();
        }
      }

      createOverlay() {
        // Remove existing overlay if any
        this.removeOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'study-portal-overlay';

        const iframe = document.createElement('iframe');
        iframe.src = getExtensionURL('/popup.html');
        iframe.style.cssText = `
          width: 350px;
          height: 500px;
          border: none;
          border-radius: 8px;
          background: white;
        `;

        overlay.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          resize: both;
          overflow: hidden;
        `;

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10001;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        `;

        closeButton.addEventListener('click', () => {
          this.removeOverlay();
        });

        overlay.appendChild(iframe);
        overlay.appendChild(closeButton);
        document.body.appendChild(overlay);
        this.overlayActive = true;
      }

      removeOverlay() {
        const overlay = document.getElementById('study-portal-overlay');
        if (overlay) {
          overlay.remove();
          this.overlayActive = false;
        }
      }
    }

    // Initialize content script
    new StudyPortalContentScript();
  },
});

declare function defineContentScript(config: any): any;
