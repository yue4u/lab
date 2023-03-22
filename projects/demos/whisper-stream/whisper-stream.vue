<template>
  <div class="root">
    whisper-stream
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import modelUrl from './ggml-small.bin?url'

const state = ref<'start' | 'stop'>('stop')

onMounted(async () => {

  // web audio context
  let context: AudioContext | null = null;

  // audio data
  let audio: Float32Array | null = null;
  let audio0: Float32Array | null = null;

  // the stream instance
  let instance = null;

  // model name
  let model_whisper: null = null;
  let print = console.log
  let Module = {
    print: print,
    printErr: print,
    setStatus(text: string) {
      print('js: ' + text);
    },
    monitorRunDependencies(left: any) {
    },
    preRun() {
      print('js: Preparing ...');
    },
    postRun() {
      print('js: Initialized successfully!');
    }
  };


  const storeFS = (fname: string, buf: any) => {
    // write to WASM file using FS_createDataFile
    // if the file exists, delete it
    try {
      Module.FS_unlink(fname);
    } catch (e) {
      // ignore
    }

    Module.FS_createDataFile("/", fname, buf, true, true);

    print('storeFS: stored model: ' + fname + ' size: ' + buf.length);

    if (model_whisper != null) {
      state.value = 'stop'
    }
  }

  //
  // microphone
  //

  const kSampleRate = 16000;
  const kRestartRecording_s = 120;
  const kIntervalAudio_ms = 5000; // pass the recorded audio to the C++ instance at this rate

  let mediaRecorder: MediaRecorder | null = null;
  let doRecording = false;
  let startTime = 0;

  // @ts-ignore
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  // @ts-ignore
  window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  function stopRecording() {
    Module.set_status("paused");
    doRecording = false;
    audio0 = null;
    audio = null;
    context = null;
  }

  function startRecording() {
    if (!context) {
      context = new AudioContext({
        sampleRate: kSampleRate,
        // channelCount: 1,
        // echoCancellation: false,
        // autoGainControl: true,
        // noiseSuppression: true,
      });
    }

    Module.set_status("");

    state.value = 'start'

    doRecording = true;
    startTime = Date.now();

    let chunks: Blob[] = [];
    let stream: MediaStream | null = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);

      let blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
      let reader = new FileReader();

      reader.onload = async (event) => {
        // @ts-ignore
        let buf = new Uint8Array(reader.result);

        if (!context) {
          return;
        }
        const audioBuffer = await context.decodeAudioData(buf.buffer)
        // TODO
        // audio = null

        let offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        let source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        const renderedBuffer = await offlineContext.startRendering()
        audio = renderedBuffer.getChannelData(0);

        print('js: audio recorded, size: ' + audio.length + ', old size: ' + (audio0 == null ? 0 : audio0.length));

        let audioAll = new Float32Array(audio0 == null ? audio.length : audio0.length + audio.length);
        if (audio0 != null) {
          audioAll.set(audio0, 0);
        }
        audioAll.set(audio, audio0 == null ? 0 : audio0.length);

        if (instance) {
          Module.set_audio(instance, audioAll);
        }
      };

      reader.readAsArrayBuffer(blob);
    };

    mediaRecorder.onstop = () => {
      if (doRecording) {
        setTimeout(() => {
          startRecording();
        });
      }
    };

    mediaRecorder.start(kIntervalAudio_ms);


    // .catch((err) => {
    //   printTextarea('js: error getting audio stream: ' + err);
    // });

    let interval = setInterval(() => {
      if (!doRecording) {
        clearInterval(interval);
        mediaRecorder?.stop();
        stream?.getTracks().forEach((track) => {
          track.stop();
        });

        state.value = 'stop'

        mediaRecorder = null;
      }

      // if audio length is more than kRestartRecording_s seconds, restart recording
      if (audio != null && audio.length > kSampleRate * kRestartRecording_s) {
        if (doRecording) {
          //printTextarea('js: restarting recording');

          clearInterval(interval);
          audio0 = audio;
          audio = null;
          mediaRecorder?.stop();
          stream?.getTracks().forEach((track) => {
            track.stop();
          });
        }
      }
    }, 100);
  }

  await loadWhisper()

  //
  // main
  //

  let nLines = 0;
  let intervalUpdate = null;
  let transcribedAll = '';

  function onStart() {
    if (!instance) {
      instance = Module.init('whisper.bin');

      if (instance) {
        print("js: whisper initialized, instance: " + instance);
      }
    }

    if (!instance) {
      print("js: failed to initialize whisper");
      return;
    }

    startRecording();

    intervalUpdate = setInterval(function () {
      const transcribed = Module.get_transcribed();

      if (transcribed != null && transcribed.length > 1) {
        transcribedAll += transcribed + '<br>';
        nLines++;

        // if more than 10 lines, remove the first line
        if (nLines > 10) {
          let i = transcribedAll.indexOf('<br>');
          if (i > 0) {
            transcribedAll = transcribedAll.substring(i + 4);
            nLines--;
          }
        }
      }

      // document.getElementById('state-status').innerHTML = Module.get_status();
      // document.getElementById('state-transcribed').innerHTML = transcribedAll;
    }, 100);
  }

  function onStop() {
    stopRecording();
  }
})


async function loadWhisper() {
  console.log('loading whisper')
  const cache = await caches.open('lab.yue.coffee/whisper');

  const cachedRes = await cache.match(modelUrl)
  if (cachedRes) {
    console.log('hit cache')
    return cachedRes
  }

  const res = await fetch(modelUrl)
  if (!res.ok) {
    throw new TypeError("bad response status");
  }

  await cache.put(modelUrl, res);
  return res
}

</script>

<style scoped></style>