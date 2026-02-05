(function () {
  // Even in the MAIN world, Error stack traces include the chrome-extension:// URL.
  // Extract the base URL and build the shim.html URL.
  function getShimUrl() {
    try {
      const stack = new Error().stack;
      const match = stack.match(/chrome-extension:\/\/[^/]+\//);
      if (match) return match[0] + 'shim.html';
    } catch (e) {}
    console.warn('[Gemini Canvas Previewer] Could not determine extension URL');
    return null;
  }

  function injectCustomPreview() {
    // Skip if native preview exists
    if (document.querySelector('mat-button-toggle-group.tab-group')) return;
    // Skip if already injected
    if (document.getElementById('custom-tab-group')) return;

    const shimUrl = getShimUrl();
    if (!shimUrl) return;

    // Ensure required DOM nodes exist
    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) return;
    const container = document.querySelector('code-immersive-panel > .container');
    if (!container) return;
    const codeEditor = container.querySelector('xap-code-editor');
    if (!codeEditor) return;
    const leftPanel = document.querySelector('code-immersive-panel toolbar .left-panel');
    if (!leftPanel) return;

    // Only for HTML
    try {
      if (monaco.editor.getModels()[0].getLanguageId() !== 'html') return;
    } catch (e) {
      return;
    }

    // --- State ---
    let isStreaming = false;
    let isPreviewVisible = false;

    // --- Create tab buttons ---
    const tabGroup = document.createElement('div');
    tabGroup.id = 'custom-tab-group';

    const codeBtn = document.createElement('button');
    codeBtn.className = 'code-btn active';
    codeBtn.textContent = 'Code';

    const previewBtn = document.createElement('button');
    previewBtn.className = 'preview-btn';
    previewBtn.textContent = 'Preview';

    tabGroup.appendChild(codeBtn);
    tabGroup.appendChild(previewBtn);

    // Insert before the diff button
    const diffButton = actionButtons.querySelector('[data-test-id="diff-view-button"]');
    if (diffButton) {
      actionButtons.insertBefore(tabGroup, diffButton);
    } else {
      actionButtons.insertBefore(tabGroup, actionButtons.firstChild);
    }

    // --- Create preview container ---
    const previewWrapper = document.createElement('div');
    previewWrapper.id = 'custom-preview-wrapper';
    previewWrapper.style.cssText = 'width:100%; height:100%; background:#f5f5f5; display:none;';
    container.insertBefore(previewWrapper, codeEditor);

    // --- Load preview (shim.html + postMessage) ---
    function loadPreview() {
      const models = monaco.editor.getModels();
      if (models.length === 0) return;
      const html = models[0].getValue();

      // Remove existing iframe
      const oldIframe = previewWrapper.querySelector('iframe');
      if (oldIframe) oldIframe.remove();

      // Create new iframe
      const iframe = document.createElement('iframe');
      iframe.sandbox =
        'allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads allow-same-origin';
      iframe.style.cssText = 'width:100%; height:100%; border:none; display:flex;';
      iframe.src = shimUrl;
      iframe.addEventListener(
        'load',
        function () {
          iframe.contentWindow.postMessage(
            { type: 'preview-html', html: html },
            '*'
          );
        },
        { once: true }
      );
      previewWrapper.appendChild(iframe);
    }

    // --- Toggle code/preview ---
    function showCode() {
      codeBtn.classList.add('active');
      previewBtn.classList.remove('active');
      codeEditor.style.display = '';
      previewWrapper.style.display = 'none';
      isPreviewVisible = false;
    }

    function showPreview() {
      if (isStreaming) return;
      loadPreview();
      previewBtn.classList.add('active');
      codeBtn.classList.remove('active');
      codeEditor.style.display = 'none';
      previewWrapper.style.display = '';
      isPreviewVisible = true;
    }

    codeBtn.addEventListener('click', showCode);
    previewBtn.addEventListener('click', showPreview);

    // --- Streaming detection ---
    function onStreamingStart() {
      isStreaming = true;
      previewBtn.disabled = true;
    }

    function onStreamingEnd() {
      isStreaming = false;
      previewBtn.disabled = false;
      if (isPreviewVisible) {
        loadPreview();
      }
    }

    const spinnerObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'childList') continue;
        for (const node of m.addedNodes) {
          if (node.tagName === 'MAT-PROGRESS-SPINNER') {
            onStreamingStart();
            return;
          }
        }
        for (const node of m.removedNodes) {
          if (node.tagName === 'MAT-PROGRESS-SPINNER') {
            onStreamingEnd();
            return;
          }
        }
      }
    });
    spinnerObserver.observe(leftPanel, { childList: true });

    // If streaming is already in progress on page load
    if (leftPanel.querySelector('mat-progress-spinner')) {
      onStreamingStart();
    }
  }

  // --- SPA support: watch for panel insertion ---
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (
            node.tagName === 'CODE-IMMERSIVE-PANEL' ||
            (node.querySelector && node.querySelector('code-immersive-panel'))
          ) {
            setTimeout(injectCustomPreview, 500);
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // If the panel already exists
  if (document.querySelector('code-immersive-panel')) {
    setTimeout(injectCustomPreview, 500);
  }
})();
