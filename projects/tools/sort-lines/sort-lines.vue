<template>
  <textarea class="text" v-model="text" />
  <pre class="result">{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
const key = 'lab:wc';
const text = ref(localStorage.getItem(key) || "");
watch(text, () => {
  localStorage.setItem(key, text.value)
})

const result = computed(() => text.value.split('\n').sort().join("\n"))
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
  margin: 2rem 0;
  /* white-space: pre-wrap; */
  /* word-break: break-all; */
  overflow: scroll;
}
</style>