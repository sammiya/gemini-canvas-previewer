window.addEventListener('message', function (event) {
  if (event.origin !== 'https://gemini.google.com') return;
  if (event.data && event.data.type === 'preview-html') {
    document.open();
    document.write(event.data.html);
    document.close();
    // Re-apply overflow-x: hidden because document.write overwrites the initial style.
    var style = document.createElement('style');
    style.textContent = 'html, body { overflow-x: hidden; }';
    document.head.appendChild(style);
  }
});
