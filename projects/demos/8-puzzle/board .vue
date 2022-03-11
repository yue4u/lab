<template>
    <div class="board">
        <!-- <span v-for></span> -->
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ board: number[][] }>();
const gridTemplate = computed(() => {
    let n = props.board.length
    return `repeat(${n}, auto) / repeat(${n}, auto)`
})
</script>

<style scoped>
.board {
    grid-template: v-bind(gridTemplate);
}
</style>