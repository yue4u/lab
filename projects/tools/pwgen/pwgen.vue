<template>
  <h1>pwgen.wasm</h1>
  <input v-model="cmds" />
  <button @click="run">run</button>

  <pre class="logs">{{ logs }}</pre>
  <pre class="logs">{{ errorLogs }}</pre>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import createPwgen from "pwgen.wasm";
import wasmUrl from "pwgen.wasm/pwgen.wasm?url";

const cmds = ref("-h");
const logs = ref("");
const errorLogs = ref("");

onMounted(run);

async function run() {
  const pwgen = await createPwgen({
    print(msg: string) {
      logs.value += `\n${msg}`;
    },
    printErr(msg: string) {
      errorLogs.value += `\n${msg}`;
    },
    locateFile() {
      return wasmUrl;
    },
  });
  logs.value = errorLogs.value = "";
  const args = cmds.value.trim().split(" ").filter(Boolean);
  await pwgen.callMain(args);
}
</script>

<style scoped></style>
