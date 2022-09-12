<template>
  <h1>GLSL Editor</h1>
  <div class="wrapper">
    <canvas class="canvas" ref="canvasEl" />
    <div class="editor" ref="editorEl" />
    <div class="extra">
      <button @click="downloadImg">download</button>
      <p class="error">{{error}}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Canvas } from 'glsl-canvas-js/dist/esm/glsl';
import { ContextMode } from 'glsl-canvas-js/dist/esm/context/context';
import * as monaco from "monaco-editor-core";
import EditorWorker from "monaco-editor-core/esm/vs/editor/editor.worker?worker";
import { conf, language } from "./glsl-language";
import init from "./init.glsl?raw";

const canvasEl = ref<HTMLCanvasElement | null>(null);
const editorEl = ref<HTMLDivElement | null>(null);
const canvasRef = ref<Canvas | null>(null);
const error = ref<string | null>();

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

onMounted(() => {
  if (!canvasEl.value) return
  if (!editorEl.value) return
  const canvas = new Canvas(canvasEl.value, {
    fragmentString: init,
    alpha: true,
    antialias: true,
    mode: ContextMode.Flat,
  });
  canvas.on('error', ({ error: e }: any) => {
    error.value = e;
  })
  canvasRef.value = canvas;

  monaco.editor.defineTheme('vs-dark-transparent', {
    base: 'vs-dark',
    inherit: true,
    colors: {
      "editor.background": '#00000000',
    },
    rules: [],
  });

  const editor = monaco.editor.create(editorEl.value, {
    value: init,
    minimap: { enabled: false },
    automaticLayout: true,
    language: "glsl",
    theme: "vs-dark-transparent",
  });

  monaco.languages.register({ id: "glsl" });
  monaco.languages.setLanguageConfiguration("glsl", conf);
  monaco.languages.setMonarchTokensProvider("glsl", language);

  editor.getModel()?.onDidChangeContent(async () => {
    const ok = await canvas.load(editor.getValue());
    if (ok) error.value = null;
  })
})

function downloadImg() {
  if (!canvasEl.value) return;
  if (!canvasRef.value) return;
  // @ts-expect-error
  canvasRef.value.render();
  Object.assign(document.createElement('a'), {
    href: canvasEl.value.toDataURL(),
    download: `glsl-canvas-${Date.now()}.png`,
  }).click();
}
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
}
</style>