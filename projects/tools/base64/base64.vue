<template>
  <textarea class="text" v-model="input" />
  <div class="radio">
    <div v-for="m in Object.keys(modes)">
      <input type="radio" name="modeSelect" :id="m" :value="m" v-model="mode" :checked="m == mode" />
      <label :for="m">{{ m }}</label>
    </div>
  </div>
  <p class="err" v-if="error">{{ error }}</p>
  <pre v-else class="result">{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
const input = ref("");
const result = ref("")
const error = ref("");
const param = new URL(location.href).searchParams.get('m') === 'd' ? 'decode' : 'encode'
const mode = ref<keyof typeof modes>(param)
// https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
const modes = {
  "encode": (str: string) => window.btoa(unescape(encodeURIComponent(str))),
  "decode": (str: string) => decodeURIComponent(escape(window.atob(str))),
}
watch([input, mode], () => {
  try {
    result.value = modes[mode.value](input.value)
    error.value = ''
  } catch (e) {
    error.value = `${e}`
  }
})
</script>

<style scoped>
.input {
  color: #fff;
  outline: none;
  background: transparent;
  width: 100%;
  min-width: 100%;
  min-height: 20vh;
}

.radio {
  display: grid;
  grid-template-columns: repeat(2, auto);
  justify-content: start;
  gap: 10px;
}
.result {
  margin: 2rem 0;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: scroll;
}
.result ::-webkit-scrollbar {
  width: 0;
  background: transparent;
}
.err {
  color: hotpink;
}
</style>