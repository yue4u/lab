<template>
  <h1>GLSL Editor</h1>
  <div class="editor" ref="editorEl" />
  <div class="wrapper">
    <canvas class="canvas" ref="canvasEl" />
    <button class="download" @click="downloadImg">download</button>
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
  canvasRef.value = canvas;

  const editor = monaco.editor.create(editorEl.value, {
    value: init,
    minimap: { enabled: false },
    automaticLayout: true,
    language: "glsl",
    theme: "vs-dark",
  });

  monaco.languages.register({ id: "glsl" });
  monaco.languages.setLanguageConfiguration("glsl", conf);
  monaco.languages.setMonarchTokensProvider("glsl", language);

  editor.getModel()?.onDidChangeContent(() => {
    canvas.load(editor.getValue());
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
  min-height: 20em;
}

.wrapper {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: auto auto;
  justify-content: left;
}

.download {
  height: fit-content;
}

.canvas {
  width: 500px;
  height: 500px;
}
</style>