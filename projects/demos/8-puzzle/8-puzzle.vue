<template>
    <p>
        implements
        <a href="https://coursera.cs.princeton.edu/algs4/assignments/8puzzle/specification.php" target="_blank"
            rel="noopener noreferrer">https://coursera.cs.princeton.edu/algs4/assignments/8puzzle/specification.php</a>
    </p>
    <div class="input">
        <select class="test-container" v-model="currentPuzzle">
            <option :disabled="currentPuzzle === key" :key="key" :value="key" v-for="key in puzzles">{{ key }}
            </option>
        </select>
        <textarea v-model="board" :rows="3"></textarea>
    </div>
    <p class="error" v-if="!solver.solvable">not solvable</p>
    <div class="steps" v-if="solver.solvable">
        <div v-for="(board, i) of solver.solved?.solution()" :key="board?.id">
            <Board v-if="board?.data" :data="board.data" />
            <p class="index">{{ i }} )</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Board from './board.vue'
import puzzle5 from './8puzzle/puzzle05.txt?raw'
import { Solver } from './solver'

const puzzleSource = import.meta.glob('./8puzzle/puzzle*.txt', { as: 'raw' })
const puzzles = Object.keys(puzzleSource).sort()
const currentPuzzle = ref(puzzles[5])
const board = ref(puzzle5)
const solver = computed(() => {
    return Solver.fromPuzzle(board.value, { maxSearchIteration: 5000 })
});

watch(currentPuzzle, async () => {
    board.value = await puzzleSource[currentPuzzle.value]()
})
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