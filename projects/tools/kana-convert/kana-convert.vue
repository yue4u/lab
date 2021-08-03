<template>
    <p>
        <input type="checkbox" v-model="flags.toHalf" />
        {{ flags.toHalf ? 'toHalf' : 'toFull' }}
        <input
            type="checkbox"
            v-model="flags.toUpper"
        />
        {{ flags.toUpper ? 'toUpper' : 'toLower' }}
    </p>
    <textarea class="text" v-model="text" />
    <pre class="result">
        {{ converted }}
    </pre>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { toFullMap, toHalfMap, toUpperMap, toLowerMap } from './kanaMap'
const text = ref("");
const flags = reactive({
    toHalf: true,
    toUpper: true,
});
const converted = computed(() => {
    const maps = [
        flags.toUpper ? toUpperMap : toLowerMap,
        flags.toHalf ? toHalfMap : toFullMap,
    ];
    return [...text.value].map(c => maps.reduce((acc, curr) => {
        return curr.get(acc) ?? acc
    }, c)).join('')
})
</script>

<style scoped>
.text {
    color: #fff;
    outline: none;
    background: transparent;
    width: 100%;
    min-width: 100%;
    min-height: 20vh;
}

.result {
    text-align: left;
    white-space: pre-wrap;
    word-break: break-all;
    display: inline;
}
</style>