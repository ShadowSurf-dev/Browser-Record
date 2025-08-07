const startBtn = document.getElementById('startBtn');
const startBufferBtn = document.getElementById('startBufferBtn');
const clipBtn = document.getElementById('clipBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const toggleClipList = document.getElementById('toggleClipList');
const bufferDurationInput = document.getElementById('bufferDuration');
const audioOption = document.getElementById('audioOption');
const clipList = document.getElementById('clipList');

let stream, recorder, chunks = [], isBuffering = false, bufferChunks = [], bufferRecorder, bufferStream;
let bufferMaxDuration = 10 * 60 * 1000;
let clipEntries = [];

function formatTime(date = new Date()) {
  return date.toLocaleString().replace(',', '').replace(/:/g, '-');
}

function addClipToList(blob, label = 'Recording') {
  const timestamp = formatTime();
  const item = document.createElement('div');
  item.className = 'clip-item';

  const toggle = document.createElement('button');
  toggle.className = 'clip-toggle';
  toggle.textContent = `📁 ${label} - ${timestamp}`;

  const content = document.createElement('div');
  content.className = 'clip-content';

  const video = document.createElement('video');
  video.src = URL.createObjectURL(blob);
  video.controls = true;

  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = '⬇️ Download';
  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = video.src;
    a.download = `${label}-${timestamp}.webm`;
    a.click();
  };

  content.appendChild(video);
  content.appendChild(downloadBtn);

  toggle.onclick = () => {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  };

  item.appendChild(toggle);
  item.appendChild(content);
  clipList.prepend(item);

  clipEntries.push({ blob, name: `${label}-${timestamp}.webm` });
}

async function getCombinedStream() {
  const audioChoice = audioOption.value;
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: audioChoice === 'tab' || audioChoice === 'both'
  });

  if (audioChoice === 'mic' || audioChoice === 'both') {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const screenAudioTracks = screenStream.getAudioTracks();
    if (screenAudioTracks.length) {
      const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]));
      screenSource.connect(dest);
    }

    const micSource = audioCtx.createMediaStreamSource(micStream);
    micSource.connect(dest);

    screenStream.getAudioTracks().forEach(t => screenStream.removeTrack(t));
    dest.stream.getAudioTracks().forEach(track => screenStream.addTrack(track));
  } else if (audioChoice === 'none') {
    screenStream.getAudioTracks().forEach(track => screenStream.removeTrack(track));
  }

  return screenStream;
}

startBtn.onclick = async () => {
  try {
    stream = await getCombinedStream();
    recorder = new MediaRecorder(stream);
    chunks = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      addClipToList(blob, 'Recording');
      startBtn.disabled = false; // Re-enable after stop
    };

    recorder.start();
    startBtn.disabled = true;

    // Stop recording when stream ends (user clicks Chrome's stop share)
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
    });
  } catch (err) {
    console.error(err);
    alert('Recording failed: ' + err.message);
    startBtn.disabled = false;
  }
};

startBufferBtn.onclick = async () => {
  if (isBuffering) {
    bufferRecorder.stop();
    bufferStream.getTracks().forEach(track => track.stop());
    isBuffering = false;
    startBufferBtn.textContent = '📹 Start Replay Buffer';
    clipBtn.disabled = true;
    return;
  }

  bufferMaxDuration = Math.min(10, parseInt(bufferDurationInput.value)) * 60 * 1000;
  bufferStream = await getCombinedStream();
  bufferChunks = [];
  isBuffering = true;
  clipBtn.disabled = false;
  startBufferBtn.textContent = '🛑 Stop Replay Buffer';

  bufferRecorder = new MediaRecorder(bufferStream, { mimeType: 'video/webm' });

  bufferRecorder.ondataavailable = e => {
    if (e.data.size > 0) {
      bufferChunks.push({ data: e.data, timestamp: Date.now() });
      const cutoff = Date.now() - bufferMaxDuration;
      bufferChunks = bufferChunks.filter(c => c.timestamp >= cutoff);
    }
  };

  bufferRecorder.start(1000);
};

clipBtn.onclick = () => {
  if (!isBuffering || bufferChunks.length === 0) return;
  const validChunks = bufferChunks.filter(c => c.timestamp >= (Date.now() - bufferMaxDuration));
  const blob = new Blob(validChunks.map(c => c.data), { type: 'video/webm' });
  addClipToList(blob, 'Clip');
};

downloadAllBtn.onclick = async () => {
  if (clipEntries.length === 0) return alert('No clips to download!');
  const zip = new JSZip();
  clipEntries.forEach(({ blob, name }) => {
    zip.file(name, blob);
  });
  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `all-clips-${Date.now()}.zip`;
  a.click();
};

toggleClipList.onclick = () => {
  clipList.style.display = clipList.style.display === 'none' ? 'block' : 'none';
};

window.addEventListener('beforeunload', () => {
  clipEntries = [];
});
