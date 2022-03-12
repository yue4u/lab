<template>
    <div class="data">
        <span :class="['cell', { match: n === i + 1 }]" v-for="(n, i) of data">{{ n || "" }}</span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ data: number[] }>();
const gridTemplate = computed(() => {
    let n = Math.sqrt(props.data.length)
    return `repeat(${n}, 2rem) / repeat(${n}, 2rem)`
})
</script>

<style scoped>
.data {
    display: grid;
    grid-template: v-bind(gridTemplate);
    gap: 5px;
}
.cell {
    border-radius: 5px;
    border: 1px solid aquamarine;
    display: grid;
    place-content: center;
}
.match {
    background-color: aquamarine;
    color: black;
}
</style>