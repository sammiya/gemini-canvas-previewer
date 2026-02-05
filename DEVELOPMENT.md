# Development Notes

This document covers implementation details and developer workflows.

## File Layout

- `manifest.json` Chrome extension manifest (MV3)
- `content.js` Main script containing all preview logic
- `content.css` Styles for the custom tab buttons
- `shim.html` Shim page loaded by the preview iframe
- `shim.js` Receives HTML via `postMessage` and writes it with `document.write`

## Reload Steps

1. Edit code and save
2. Open `chrome://extensions`
3. Click the reload button on the extension card
4. Reload Gemini (F5)

## Debugging

1. Open DevTools on the Gemini page
2. Check the Console for errors (content script logs appear in the page console)
3. Inspect the injected DOM elements (`#custom-tab-group` and `#custom-preview-wrapper`)

## How It Works

1. **Panel detection** Use `MutationObserver` to watch for `<code-immersive-panel>`
2. **Native preview detection** Check for `<mat-button-toggle-group class="tab-group">`
3. **Code retrieval** Read from the Monaco global `monaco.editor.getModels()`
4. **Preview rendering** Load `shim.html` in an `iframe` and pass HTML via `postMessage`
5. **Streaming detection** Watch `<mat-progress-spinner>` for start/end

## Implementation Notes

- `content.js` runs in `world: "MAIN"`.
- Reason: `monaco` is a page global and is not accessible from the isolated world.
- In the MAIN world, `chrome.runtime.getURL()` is not available, so the `chrome-extension://.../` base URL is extracted from `Error().stack` to build the `shim.html` URL.
- `iframe.srcdoc` and `blob:` inherit Gemini CSP (`require-trusted-types-for 'script'`), which blocks inline scripts.
- For that reason, the preview uses a separate origin (`shim.html` inside the extension) and passes HTML via `postMessage`.
- `shim.html` is sandboxed via `manifest.json` `sandbox.pages`.
- The sandbox CSP explicitly allows downloads via `content_security_policy.sandbox`.
