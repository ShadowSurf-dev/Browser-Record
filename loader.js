(async function () {
  const base = "https://raw.githubusercontent.com/ShadowSurf-dev/Browser-Record/refs/heads/main/ui.html";

  const [htmlResp, jsResp, ffmpegResp] = await Promise.all([
    fetch(base + "ui.html"),
    fetch(base + "ui.js"),
    fetch(base + "ffmpeg.min.js"),
  ]);

  const html = await htmlResp.text();
  const js = await jsResp.text();
  const ffmpeg = await ffmpegResp.text();

  const fullHtml = html
    .replace(
      '</head>',
      `<script>${ffmpeg}</script>\n<script>${js}</script>\n</head>`
    )
    .replace(/<script src=".*?ffmpeg.*?"><\/script>/, '') // remove old ffmpeg line if present
    .replace(/<script src=".*?ui\.js.*?"><\/script>/, ''); // remove old ui.js line

  const tab = window.open("about:blank", "_blank");
  tab.document.open();
  tab.document.write(fullHtml);
  tab.document.close();
})();
