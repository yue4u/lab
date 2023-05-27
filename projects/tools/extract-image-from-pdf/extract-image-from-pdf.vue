<template>
  <input class="file-input" type="file" @change="handleFile" />
  <p>
    state: {{ state }}
    <span v-if="name">{{ name }}</span>
  </p>
  <p v-if="numPages">All {{ numPages }}</p>
  <p v-if="error">{{ error }}</p>
  <div class="pages">
    <pdfPage v-for="(page, index) of pdfPages" :index="index + 1" :name="name" :page="page" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import * as PDFJS from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';
import pdfPage from './pdf-page.vue'
import type { PDFPageProxy } from './types'

PDFJS.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const state = ref<'idle' | 'working' | 'done'>('idle')
const name = ref('')
const error = ref<string | null>(null)
const numPages = ref<number | null>(null)
const pdfPages = ref<PDFPageProxy[]>([]);

const handleFile = async (event: any) => {
  state.value = 'working'
  const [file] = Array.from(event.target.files || [])
  if (!file) return
  // @ts-expect-error
  name.value = file.name
  // @ts-expect-error
  await extract(file)
}

async function extract(file: File) {
  pdfPages.value = []
  const fileReader = new FileReader();
  fileReader.readAsArrayBuffer(file);
  fileReader.onload = async () => {
    if (!fileReader.result) return
    // @ts-ignore
    const loadingTask = PDFJS.getDocument(new Uint8Array(fileReader.result));

    const pdf = await loadingTask.promise.catch(reason => {
      console.error(reason);
      error.value = reason.message ?? reason
      return null
    })
    if (!pdf) return

    numPages.value = pdf.numPages
    const pages = await Promise.all([...Array(pdf.numPages).keys()].map(pageNumber => {
      console.log(pageNumber + 1)
      return pdf.getPage(pageNumber + 1)
    }))
    console.log(pages)
    pdfPages.value = pages

    nextTick(() => {
      state.value = 'done'
    })
  }
}


</script>

<style scoped>
.file-input {
  border: aquamarine 2px solid;
}

.pages {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
}
</style>