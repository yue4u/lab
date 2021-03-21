<template>
  <form @submit.prevent="onSubmit" class="grid">
    <label for="url">url:</label>
    <input
      type="url"
      placeholder="https://..."
      id="url"
      name="cowbell"
      min="0"
      max="20"
      step="1"
      v-model="url"
    />
    <label for="token">token:</label>
    <input type="password" id="token" name="cowbell" min="0" max="100" step="1" v-model="token" />
    <button :class="['generate', { disable }]" type="submit" :disabled="disable">Generate</button>
  </form>
  <div class="result">
    <p class="link" v-if="state.data" @click="copy">{{ state.data }}</p>
    <p class="error" v-else-if="state.error">{{ state.error }}</p>
    <span class="notify" v-if="notify">copied</span>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { createLocalStorage } from '@/site/utils'
const store = createLocalStorage('lab:short-link')
const token = ref(store.get() || "");
const notify = ref(false);
const url = ref("");
const state = reactive<{
  working: boolean,
  error: string | null,
  data: string | null
}>({
  working: false,
  error: null,
  data: null
})

const disable = computed(() => !(url.value && token.value))

const onSubmit = async () => {
  try {
    const res = await fetch(
      'https://yue.cat/shorten',
      {
        method: 'post',
        body: JSON.stringify({ url: url.value, token: token.value }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      })
    const { data, error } = await res.json();
    if (error) {
      state.error = error
    }
    if (data) {
      state.data = data.url
    }

  } catch {
    state.data = null
    state.error = 'faild'
  }
}

const copy = async () => {
  if (!state.data) return
  await navigator.clipboard.writeText(state.data)
  notify.value = true
  setTimeout(() => {
    notify.value = false
  }, 1000)
}

watch(token, () => {
  store.set(token.value)
})
</script>

<style scoped>
.grid {
  font-size: 2rem;
  display: grid;
  grid-template-columns: 10rem 1fr;
  align-items: center;
  gap: 1rem;
}
input {
  font-size: 1.4rem;
}
.text {
  width: 100%;
  min-width: 100%;
  min-height: 20vh;
}
.result {
  margin: 2rem 0;
  font-size: 2rem;
  text-align: center;
}
.link {
  text-decoration: underline;
  font-size: 3rem;
  color: skyblue;
  text-shadow: 0 0 1rem #000;
  text-align: center;
  padding: 5px 10px;
  transition: 0.1s all ease-in-out;
}
.link:hover {
  background-color: rgba(100 100 100 / 0.5);
}
.generate {
  font-size: 1.4rem;
  appearance: none;
  border: none;
  width: 100%;
  background-color: aquamarine;
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
}
.generate.disable {
  background-color: #555;
  color: #777;
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: hotpink;
}
.notify {
  color: yellowgreen;
}
</style>