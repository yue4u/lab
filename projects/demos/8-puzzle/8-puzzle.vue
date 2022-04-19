<template>
    <p>
        implements
        <a href="https://coursera.cs.princeton.edu/algs4/assignments/8puzzle/specification.php" target="_blank"
            rel="noopener noreferrer">https://coursera.cs.princeton.edu/algs4/assignments/8puzzle/specification.php</a>
    </p>
    <div class="input">
        <select class="test-container" @change="
            // @ts-expect-error
            board = $event.target.value
        ">
            <option :disabled="board === val" :key="key" :value="val" v-for="[key, val] in tests">{{ key }}</option>
        </select>
        <textarea v-model="board" :rows="3"></textarea>
    </div>
    <p class="error" v-if="!solver.solvable">not solvable</p>
    <div class="steps" v-if="solver.solvable">
        <div v-for="(board, i) of solver.solved?.solution()" :key="board?.id">
            <Board :data="board?.data" />
            <p class="index">{{ i }} )</p>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import Board from './board.vue'
import puzzle5 from './8puzzle/puzzle05.txt?raw'
import { Solver } from './solver'

const tests = (Object.entries(import.meta.glob('./8puzzle/puzzle*.txt', { as: 'raw' })) as any as [string, string][]).sort()

const board = ref(puzzle5)
const solver = computed(() => {
    return Solver.fromPuzzle(board.value, { maxSearchIteration: 5000 })
});

</script>

<style scoped>
.input {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
}

.steps {
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 2rem;
}
</style>