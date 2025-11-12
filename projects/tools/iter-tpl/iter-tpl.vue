<template>
  <h1>Itertool and Template</h1>
  <h2>Items (1 item per line)</h2>
  <textarea class="text" v-model="itemText" name="" id=""></textarea>
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

  <input
    type="range"
    id="repeat"
    name="cowbell"
    min="1"
    :max="items.length"
    step="1"
    v-model="r"
  />

  <h2>Result</h2>

  <pre class="result">{{ resultText }}</pre>

  <h2>Temple (from golang's "text/template")</h2>
  <textarea class="text" v-model="templateText"></textarea>
  <pre class="result">{{ tplResultText }}</pre>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from "vue";
import { iterTpl as it } from "./js/iter-tpl.min";
import Worker from "./iter-tpl.worker?worker";
// import implUrl from "./js/iter-tpl.min?url";

let iterTpl = it;

// const reinit = () => {
//   import(`${implUrl}&d=${Date.now()}`).then((i) => {
//     iterTpl = i.iterTpl;
//   });
// };

const itemText = ref(["apple", "banana", "cherry"].join("\n"));
const templateText = ref("{{ $0 }} -> {{ $1 }}");
const r = ref(2);

const mode = ref<keyof typeof modes>("combinations");
// https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
const modes = {
  combinations: iterTpl.combinations,
  permutations: iterTpl.permutations,
};

const items = computed(() => {
  return itemText.value
    .split("\n")
    .map((i) => i.trim())
    .filter(Boolean);
});

const result = computed(() => {
  return modes[mode.value](items.value, r.value);
});
const resultText = computed(() => {
  return result.value.map((r) => JSON.stringify(r)).join("\n");
});

const tplResultText = ref("");

watchEffect(() => {
  const templateWorker = new Worker();
  templateWorker.onmessage = (m) => {
    tplResultText.value = m.data;
    templateWorker.terminate();
  };
  templateWorker.postMessage([templateText.value, result.value]);
});
</script>

<style scoped>
.text {
  color: #fff;
  outline: none;
  background: transparent;
  width: 100%;
  min-width: 100%;
  min-height: 10vh;
}

.result {
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
  display: inline;
}
</style>
