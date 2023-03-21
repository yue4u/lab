<template>
  <div class="root">
    whisper-stream
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import modelUrl from './ggml-small.bin?url'

onMounted(async () => {
  await loadWhisper()
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