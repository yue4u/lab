<template>
  <textarea class="text" v-model="input" />
  <div class="radio">
    <div v-for="m in Object.keys(modes)">
      <input
        type="radio"
        name="modeSelect"
        :id="m"
        :value="m"
        v-model="mode"
        :checked="m == mode"
      />
      <label :for="m">{{ m }}</label>
    </div>
  </div>
  <pre class="result">{{ result }}</pre>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { nnanna, annann } from "nnanna";

const input = ref("");
const result = ref("");
const param =
  new URL(location.href).searchParams.get("m") === "d" ? "annann" : "nnanna";
const mode = ref<keyof typeof modes>(param);
const modes = { nnanna, annann };

watch([input, mode], () => {
  result.value = modes[mode.value](input.value);
});
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
