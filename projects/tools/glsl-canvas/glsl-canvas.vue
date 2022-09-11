<template>
  <h1>GLSL Editor</h1>
  <div class="editor" ref="editorEl" />
  <canvas class="canvas" ref="canvasEl" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Canvas } from 'glsl-canvas-js/dist/esm/glsl';
import { ContextMode } from 'glsl-canvas-js/dist/esm/context/context';
import * as monaco from "monaco-editor-core";
import EditorWorker from "monaco-editor-core/esm/vs/editor/editor.worker?worker";
import { conf, language } from "./glsl-language";

const canvasEl = ref<HTMLCanvasElement | null>(null);
const editorEl = ref<HTMLDivElement | null>(null);

const init = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

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
</script>

<style scoped>
.editor {
  min-height: 20em;
}

.canvas {
  width: 500px;
  height: 500px;
}
</style>