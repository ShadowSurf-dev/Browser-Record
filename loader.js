(async () => {
  const url = 'https://raw.githubusercontent.com/ShadowSurf-dev/Browser-Record/refs/heads/main/ui.html';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load UI');
    const html = await res.text();

    const win = window.open('about:blank', '_blank');
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (err) {
    alert('Loader error: ' + err.message);
  }
})();
