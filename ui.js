// ui.js

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const audioOption = document.getElementById('audioOption');
const container = document.getElementById('videoContainer');
const placeholder = document.getElementById('placeholder');

let stream, recorder, chunks = [];

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

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      const video = document.createElement('video');
      video.controls = true;
      video.src = url;

      const linkWebm = document.createElement('a');
      linkWebm.href = url;
      linkWebm.download = 'recording.webm';
      linkWebm.textContent = '⬇️ Download .webm';

      container.innerHTML = '';
      container.appendChild(video);
      container.appendChild(linkWebm);

      const status = document.createElement('div');
      status.textContent = 'Converting to MP4...';
      status.style.marginTop = '10px';
      container.appendChild(status);

      const { createFFmpeg, fetchFile } = FFmpeg;
      const ffmpeg = createFFmpeg({ log: false });
      await ffmpeg.load();

      ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob));
      await ffmpeg.run('-i', 'input.webm', 'output.mp4');
      const mp4Data = ffmpeg.FS('readFile', 'output.mp4');
      const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
      const mp4Url = URL.createObjectURL(mp4Blob);

      const linkMp4 = document.createElement('a');
      linkMp4.href = mp4Url;
      linkMp4.download = 'recording.mp4';
      linkMp4.textContent = '⬇️ Download .mp4';
      container.appendChild(linkMp4);

      status.textContent = 'Conversion complete.';
    };

    recorder.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    pauseBtn.disabled = false;
    placeholder.style.display = 'none';
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

stopBtn.onclick = () => {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    stream.getTracks().forEach(track => track.stop());
  }
  stopBtn.disabled = true;
  pauseBtn.disabled = true;
};

pauseBtn.onclick = () => {
  if (!recorder) return;
  if (recorder.state === 'recording') {
    recorder.pause();
    pauseBtn.textContent = '▶️ Resume';
  } else if (recorder.state === 'paused') {
    recorder.resume();
    pauseBtn.textContent = '⏸️ Pause';
  }
};
