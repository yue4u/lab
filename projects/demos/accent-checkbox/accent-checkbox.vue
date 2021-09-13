<template>
  <div class="info">
    <div>
      <p>
        <input type="file" @change="handleFile" />
      </p>
      <video ref="vid" class="media" autoplay muted loop />
    </div>
    <div>
      <p class="log" v-for="l in log">{{ l }}</p>
    </div>
  </div>
  <!-- <img class="media" autoplay muted v-if="debugSrc" :src="debugSrc" /> -->
  <div class="canvas">
    <input
      class="best-checkbox"
      v-for="c in colors"
      :style="{ '--c': c }"
      :checked="true"
      type="checkbox"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ChangeEventHandler } from 'react'
import { createFFmpeg } from '@ffmpeg/ffmpeg';
// not work for prod
// import corePath from '@ffmpeg/core/dist/ffmpeg-core.js?url'

const log = ref<string[]>([])
const w = ref(0)
const h = ref(0)
// const debugSrc = ref<string | null>(null)
const vid = ref<HTMLVideoElement | null>(null);
const colors = ref<string[]>([])

const ffmpeg = createFFmpeg({
  corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js', logger({ message }) {
    log.value.push(message)
    log.value = log.value.slice(-10)
  }
});

onMounted(async () => {
  await ffmpeg.load();
})

const cache = new Map<number, string[]>();

const handleFile: ChangeEventHandler<HTMLInputElement> = async (event) => {
  const [file] = Array.from(event.target.files || [])
  if (!file) return
  await process();

  let count = 1;
  const canvas = document.createElement('canvas');
  canvas.width = w.value;
  canvas.height = h.value;
  const ctx = canvas.getContext('2d')!;

  requestAnimationFrame(step)

  async function process() {
    await new Promise((ok) => {
      if (!vid.value) return

      // calculate sie
      vid.value.addEventListener('loadedmetadata', function () {
        const [vw, vh] = [vid.value!.videoWidth, vid.value!.videoHeight];
        [w.value, h.value] = vw >= vh ? [100, Math.floor(100 * vh / vw)] : [Math.floor(100 * vw / vh), 100]
        ok(undefined)
      });
      vid.value.src = URL.createObjectURL(file)
    });

    ffmpeg.FS('writeFile', 'i', new Uint8Array(await file.arrayBuffer()))
    await ffmpeg.run(...`-i i -s ${w.value}x${h.value} -vf fps=5/1 %d.png`.split(' '))
  }

  // let l = performance.now()
  async function render() {
    // const n = performance.now();
    // console.log(`render in ${n - l}`)
    // l = n;
    const cached = cache.get(count);
    if (cached) {
      colors.value = cached;
      return
    }
    const frameImg = `${count}.png`;
    const src = URL.createObjectURL(
      new Blob([ffmpeg.FS('readFile', frameImg).buffer])
    )
    // debugSrc.value = src;

    // naive impl of get color at pixcel
    // maybe choose a better img format at ffmpeg side?
    const img = document.createElement('img');
    await new Promise((ok) => {
      img.onload = ok
      img.src = src
    })
    ctx.drawImage(img, 0, 0, w.value, h.value);
    const rgbaArray = Array.from({ length: w.value * h.value }).map((_, i) => {
      const [x, y] = [i % w.value, Math.floor(i / w.value)]
      return ctx.getImageData(x, y, 1, 1).data.join(',')
    })
    cache.set(count, rgbaArray)
    ffmpeg.FS('unlink', frameImg)
    colors.value = rgbaArray;
  }

  async function step() {
    try {
      await render();
      count++
    } catch {
      // todo: skip the read call to non-exist out-of-range final img
      count = 1
    }
    requestAnimationFrame(step)
  }
}
</script>

<style scoped>
.info {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.canvas {
  display: grid;
  grid-template: repeat(v-bind(h), 13px) / repeat(v-bind(w), 13px);
}
.media {
  max-width: 100%;
  max-height: 10vh;
}

.log {
  color: cadetblue;
  padding: 0;
  margin: 2px;
  text-overflow: ellipsis;
}
.best-checkbox {
  /* transform: scale(0.8); */
  accent-color: rgba(var(--c));
}
</style>