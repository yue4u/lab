<template>
  <div class="grid">
    <label for="noise">noise: {{ noise }}</label>
    <input type="range" id="noise" name="cowbell" min="0" max="20" step="1" v-model="noise" />
    <label for="rate">rate: {{ rate }}</label>
    <input type="range" id="rate" name="cowbell" min="0" max="100" step="1" v-model="rate" />
    <label for="offBit">offBit: {{ offBit }}</label>
    <input type="range" id="offBit" name="cowbell" min="0" max="16" step="1" v-model="offBit" />
  </div>
  <textarea class="text" v-model="text" />
  <pre class="result">{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { randomInt, createLocalStorage } from '@/site/utils'
const store = createLocalStorage('lab:tn')
const text = ref(store.get() || `
<template>
  <div class="grid">
    <label for="noise">noise: {{ noise }}</label>
    <input type="range" id="noise" name="cowbell" min="0" max="20" step="1" v-model="noise" />
    <label for="rate">rate: {{ rate }}</label>
    <input type="range" id="rate" name="cowbell" min="0" max="100" step="1" v-model="rate" />
    <label for="offBit">offBit: {{ offBit }}</label>
    <input type="range" id="offBit" name="cowbell" min="0" max="16" step="1" v-model="offBit" />
  </div>
  <textarea class="text" v-model="text" />
  <pre class="result">{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { randomInt, createLocalStorage } from '@/site/utils'
const store = createLocalStorage('lab:tn')
const text = ref(store.get() || "");

const offBit = ref(1)
const noise = ref(5)
const rate = ref(30)

const result = computed(() => [...text.value].map(char => {
  const shouldChange = randomInt(0, 100) <= rate.value
  if (!shouldChange) {
    return char
  }
  const base = char.charCodeAt(0)
  const bit = ~(1 << (offBit.value - 1));
  const nosieVal = randomInt(-noise.value, noise.value)
  return String.fromCharCode((base + nosieVal) & bit)
}).join(""))

watch(text, () => {
  store.set(text.value)
})
`);

const offBit = ref(1)
const noise = ref(5)
const rate = ref(30)

const result = computed(() => [...text.value].map(char => {
  const shouldChange = randomInt(0, 100) <= rate.value
  if (!shouldChange) {
    return char
  }
  const base = char.charCodeAt(0)
  const bit = ~(1 << (offBit.value - 1));
  const nosieVal = randomInt(-noise.value, noise.value)
  return String.fromCharCode((base + nosieVal) & bit)
}).join(""))

watch(text, () => {
  store.set(text.value)
})
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
  word-break: break-all;
}
</style>