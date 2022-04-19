<template>
  <Slider class="slider" v-model="value" :default="[0, content.length]" :max="content.length" />
  <textarea class="content" name="content" v-model="content" :cols="30" :rows="10"></textarea>
  <p> len: {{ content.length }} </p>
  <pre class="render">
    <span class="other"> {{ content.substring(0, value[0]) }} </span>
    <span class="highlight"> {{ content.substring(value[0], value[1]) }} </span>
    <span class="other">  {{ content.substring(value[1]) }}</span>
  </pre>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Slider from '@vueform/slider'
import '@vueform/slider/themes/default.css'

const content = ref<string>(`Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`)
const value = ref([5, 20]);
</script>

<style scoped>
.content {
  width: 100%;
}

.slider {
  --accent: lightgoldenrodyellow;
  background-color: lightslategrey;
  --slider-tooltip-color: #000;
  --slider-tooltip-bg: var(--accent);
  --slider-connect-bg: var(--accent);
  margin-bottom: 1rem;
}

.render {
  white-space: inherit;
}

.highlight {
  padding: 3px;
  border-radius: 3px;
  background-color: lightgoldenrodyellow;
  color: #000;
  font-weight: bold;
}

.other {
  color: lightslategrey;
}
</style>