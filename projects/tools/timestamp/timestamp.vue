<template>
  <p class="len">Date: {{ date }}</p>
  <input type="number" v-model="text" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
const text = ref(+new Date);
const date = computed(() => {
  try {
    return new Date(text.value).toISOString()
  } catch (e) {
    return e
  }
})
</script>

<style scoped>
input[type='number'] {
  -moz-appearance: textfield;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>