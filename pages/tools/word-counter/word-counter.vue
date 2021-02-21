<template>
  <p class="len">length:{{ text.length }}</p>
  <textarea class="text" v-model="text" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
const key = 'lab:wc';
const text = ref(localStorage.getItem(key) || "");
watch(text, () => {
  localStorage.setItem(key, text.value)
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
</style>