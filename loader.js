// loader.js

(async function () {
  const RAW_HTML_URL = "https://raw.githubusercontent.com/yourusername/yourrepo/main/ui.html";

  try {
    const response = await fetch(RAW_HTML_URL);
    const html = await response.text();

    const newTab = window.open("about:blank", "_blank");
    newTab.document.open();
    newTab.document.write(html);
    newTab.document.close();
  } catch (err) {
    alert("Failed to load recorder UI: " + err.message);
  }
})();
