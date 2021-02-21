<template>
  <div class="grid">
    <label for="separator">separator</label>
    <input v-model="separator" />
    <label for="repeat">repeat: {{ repeat }}</label>
    <input type="range" id="repeat" name="cowbell" min="0" max="20" step="1" v-model="repeat" />
  </div>
  <textarea class="text" v-model="text" />
  <pre class="result">{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
const separator = ref(" ")
const repeat = ref(1)
const text = ref("");
const result = computed(() => [...text.value].join(separator.value.repeat(repeat.value)))
</script>

<style scoped>
.grid {
  font-size: 1.4rem;
  display: grid;
  grid-template-columns: 10rem 1fr;
  align-items: center;
}
.text {
  width: 100%;
  min-width: 100%;
  min-height: 20vh;
}
.result {
  margin: 2rem 0;
  white-space: pre-wrap;
}
</style>