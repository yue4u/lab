<template>
  <div class="ch-textfield">
    <div class="ch-textfield-input-container">
      <input class="ch-textfield-input" placeholder="size..." v-model="input" />
    </div>
  </div>
  <p>{{ len }} bytes</p>
  <button class="ch-button primary" @click="download" :disabled="!Number.isFinite(len) || len < 0">download</button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'


const input = ref("1M");
const MAX_BYTES = 65536
const MAX_UINT32 = 4294967295
const powers = {
  'k': 1,
  'm': 2,
  'g': 3,
};
const regex = /(?<num>\d+(?:\.\d+)?)\s?(?<unit>k|m|g|t)?b?/i;

const len = computed(() => {
  try {
    let { num, unit } = regex.exec(input.value)?.groups ?? {};
    const bignum = Number(num)

    if (unit) {
      return Math.floor(bignum * Math.pow(1024, powers[unit.toLowerCase() as keyof typeof powers]));
    }

    return Math.floor(Math.max(bignum, 0))
  } catch (e) {
    console.error(e)
    return 0
  }
});

function download() {
  const href = URL.createObjectURL(new Blob([randomBytes(len.value)]))
  try {
    const link = Object.assign(
      document.createElement("a"),
      {
        download: `${len.value}bytes.bin`,
        href
      }
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(href)
  }
}

function randomBytes(size: number) {
  if (size > MAX_UINT32) throw new RangeError('requested too many random bytes')

  const bytes = new ArrayBuffer(len.value)
  const uint8Array = new Uint8Array(bytes)

  for (let generated = 0; generated < size; generated += MAX_BYTES) {
    uint8Array.set(crypto.getRandomValues(new Uint8Array(MAX_BYTES)), generated)
  }
  console.log(bytes.byteLength)

  return bytes
}
</script>
