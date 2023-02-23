<template>
    <h1>zopflipng.wasm</h1>
    <p>Compress imgs using <a class="link" href="https://github.com/lab-yue/zopfli">https://github.com/lab-yue/zopfli</a>
    </p>
    <p>
        <input type="file" accept="image/*" @change="handleFile" />
    </p>
    <button @click="run">optimize</button>

    <pre class="logs">{{ logs }}</pre>

    <div v-if="preview">
        <h2>preview</h2>
        <img class="img" :src="preview" />
    </div>

    <div v-if="optimized">
        <h2>optimized</h2>
        <img class="img" :src="optimized" />
    </div>
</template>

<script setup lang="ts" >
import { onMounted, ref } from 'vue';
// @ts-expect-error
import createZopflipng from './zopflipng'

const logs = ref("")
const optimized = ref("")
const fileRef = ref<File | null>(null)
const preview = ref<string | null>(null)
const zopflipngRef = ref(null)

const ms = new Intl.RelativeTimeFormat('en', { style: 'narrow' });

onMounted(async () => {
    zopflipngRef.value = await createZopflipng({
        print(msg: string) { logs.value += `\n${msg}` },
        printErr(msg: string) { logs.value += `\n${msg}` }
    })
})

async function run() {
    const zopflipng: any = zopflipngRef.value;
    if (!zopflipng) return;
    if (!fileRef.value) return;
    const start = performance.now()
    logs.value += `Working on ${fileRef.value.name}. It may take a loooong time.`

    await zopflipng.FS.writeFile(fileRef.value.name, new Uint8Array(await fileRef.value.arrayBuffer()))
    await zopflipng.callMain(['-m', fileRef.value.name, `${fileRef.value.name}-small.png`])
    const duration = performance.now() - start
    logs.value += `Finished in ${ms.format(duration / 1000, 'seconds')}\n`
    if (optimized.value) { URL.revokeObjectURL(optimized.value) }
    optimized.value = URL.createObjectURL(
        new Blob([zopflipng.FS.readFile(`${fileRef.value.name}-small.png`).buffer])
    )
}

// @ts-expect-error
const handleFile = async (event) => {
    const [file]: File[] = Array.from(event.target.files || [])
    if (!file) return
    fileRef.value = file
    if (preview.value) { URL.revokeObjectURL(preview.value) }
    preview.value = URL.createObjectURL(file)
}
</script>

<style scoped>
.link {
    display: inline-block;
    color: cyan;
}

.img {
    max-width: 100%;
}

.logs {
    white-space: pre-wrap;
}
</style>