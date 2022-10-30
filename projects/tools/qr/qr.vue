<template>
  <h1>QRCode</h1>
  <h2>Read</h2>
  <button @click="fromClipboard">read from clipboard</button>
  <textarea class="editor" disabled :value="codeReader?.data" />

  <h2>Write</h2>
  <textarea class="editor" v-model="codeWriterData" />
  <img class="qrcode" v-if="codeWriterImgSrc" :src="codeWriterImgSrc" />
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import jsQR, { type QRCode } from 'jsqr'
import qr from 'qrcode'

const codeWriterData = ref("");
const codeWriterImgSrc = ref<string | null>(null);

watch(codeWriterData, async () => {
  codeWriterImgSrc.value = codeWriterData.value.length //
    ? await qr.toDataURL(codeWriterData.value, {
      scale: 6,
      margin: 2,
    }) //
    : null;
});

const codeReader = ref<QRCode | null>(null);

let objectURL: string | null = null;

const fromClipboard = async () => {
  const data = await readClipboardImg();
  if (!data) return;
  objectURL && URL.revokeObjectURL(objectURL);
  objectURL = URL.createObjectURL(data);
  const img = new Image();

  await new Promise(resolve => { img.onload = resolve; img.src = objectURL! });
  const ctx = Object.assign(document.createElement('canvas'), {
    width: img.width,
    height: img.height
  }).getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  codeReader.value = jsQR(imageData.data, imageData.width, imageData.height);
}

const readClipboardImg = async (): Promise<Blob | undefined> => {
  const item_list = await navigator.clipboard.read();
  for (const item of item_list) {
    for (const type of item.types) {
      if (type.startsWith('image/')) {
        return item.getType(type);
      }
    }
  }
}
</script>

<style scoped>
.editor {
  width: 100%;
}

.editor[disabled] {
  border-color: gray;
}

.qrcode {
  width: 100%;
}
</style>