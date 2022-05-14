<template>
    <div class="container">
        <img class="img" :src="imgData" />
        <p class="info">
            {{ index }}
            <a class="download" :download="`${name}-page-${index}.png`" :href="imgData">
                <span>download</span>
            </a>
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { PDFPageProxy } from './types'

const props = defineProps<{ page: PDFPageProxy, index: number, name: string }>()
const imgData = ref<string>("")
const scale = 1.5;
const viewport = props.page.getViewport({ scale });

onMounted(async () => {
    const canvas = document.createElement('canvas');
    // Prepare canvas using PDF page dimensions
    const canvasContext = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    // Render PDF page into canvas context
    const renderContext = { canvasContext, viewport }
    const renderTask = props.page.render(renderContext);
    await renderTask.promise
    imgData.value = canvas.toDataURL('image/png')
})

</script>

<style>
.container {
    width: 100%;
}
.img {
    object-fit: contain;
    display: inline-block;
    width: 100%;
}
.info {
    display: grid;
    grid-template-columns: 1fr 1fr;
}
.download {
    display: grid;
    place-content: center;
}
.download:hover {
    color: #000;
    background-color: aquamarine;
}
</style>