<template>
  <h2>
    <label for="factor">factor {{ factor }}</label>
  </h2>
  <input
    id="factor"
    type="range"
    min="0"
    max="1"
    step="0.001"
    v-model="factor"
  />

  <div>
    <h2>filterMode</h2>
    <input id="nearest" type="radio" value="nearest" v-model="filterMode" />
    <label for="nearest">nearest</label>
    <input id="linear" type="radio" value="linear" v-model="filterMode" />
    <label for="linear">linear</label>
  </div>

  <div>
    <h2>File</h2>
    <input id="file" type="file" @change="handleFile" />
  </div>

  <div class="wrapper">
    <canvas
      class="canvas"
      :height="500 * dpi"
      :width="500 * dpi"
      ref="canvasEl"
    />
    <div class="editor" ref="editorEl" />
    <div class="extra">
      <button @click="downloadImg">download</button>
      <p class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { pixelate } from "./pixelate";

const canvasEl = ref<HTMLCanvasElement | null>(null);
const editorEl = ref<HTMLDivElement | null>(null);
const error = ref<string | null>();
const factor = ref<number>(0.7);
const active = ref(true);
const fileRef = ref<File | null>(null);
const filterMode = ref<GPUFilterMode>("nearest");
const dpi = window.devicePixelRatio;

onMounted(async () => {
  if (!canvasEl.value) return;
  if (!editorEl.value) return;
  try {
    const { render } = await pixelate(canvasEl.value);

    const main = () => {
      if (!active.value) return;
      render({
        factor: factor.value,
        filterMode: filterMode.value,
        sourceFile: fileRef.value,
      });
      requestAnimationFrame(main);
    };
    main();
  } catch (e) {
    error.value = `${e}`;
  }
});

onBeforeUnmount(() => {
  active.value = false;
});

function downloadImg() {
  if (!canvasEl.value) return;
  Object.assign(document.createElement("a"), {
    href: canvasEl.value.toDataURL(),
    download: `pixelate-${Date.now()}.png`,
  }).click();
}

// @ts-expect-error
const handleFile = async (event) => {
  const [file]: File[] = Array.from(event.target.files || []);
  if (!file) return;
  fileRef.value = file;
};
</script>

<style scoped>
.editor {
  grid-area: editor;
  height: 80vh;
}

.wrapper {
  height: 100%;
  margin-top: 1rem;
  display: grid;
  grid-template-areas:
    "canvas editor"
    "extra editor";
  grid-template-columns: 500px 1fr;
  grid-template-rows: 500px auto;
  justify-content: left;
}

@media screen and (width<=1400px) {
  .wrapper {
    grid-template-areas:
      "canvas canvas"
      "extra extra"
      "editor editor";
  }
}

.error {
  grid-area: error;
  color: hotpink;
  font-weight: bold;
  text-align: left;
}

.extra {
  grid-area: extra;
  margin-top: 1rem;
  height: fit-content;
  width: fit-content;
}

.canvas {
  grid-area: canvas;
  width: 500px;
  height: 500px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
