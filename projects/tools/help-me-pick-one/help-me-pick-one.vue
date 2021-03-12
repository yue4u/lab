<template>
  <p class="control">
    {{message}}
    <button class="read" @click="readFromClipboard">read from clipboard</button>
    <button class="read clear" @click="clearAll">clear all</button>
  </p>
  <ul class="list">
    <li class="item" v-for="(item, index) in items" :key="item">
    <button class="nope" @click="items.splice(index, 1)">Nope</button>
    <span>{{item}}</span>
  </li>
  </ul>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
let items = reactive<string[]>([]);
const message = computed(() => {
  if (!items.length){
    return `Nothing to pick from. Nice`
  }
  if (items.length>1){
    return `${items.length} remains...`
  }
  return `you picked ${items[0]} !`
})

const readFromClipboard = async ()=>{
  const text = await navigator.clipboard.readText()
  text.split('\n').filter(Boolean).forEach(item=>{
    items.push(item)
  })
}
const clearAll = ()=>{
  items.splice(0)
}
</script>

<style scoped>
  .control{
    display: grid;
    grid-template-columns: auto auto auto;
    font-size: 1.4rem;
    align-items: center;
  }
.read{
  appearance: none;
  border: 0;
  cursor: pointer;
  background-color: aquamarine;
  padding: 1rem;
  margin-left: 1rem;
  height: 100%;

}
.clear{
  background-color: transparent;
  color:  #ddd;
  border: 2px solid #ccc;
}
.list{
  display: grid;
  gap: 1rem;
}
.item{
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2rem;
  font-size: 1.4rem;
  align-items: center;
}
.item:hover{
  background-color: #ff69b459;
}
.nope{
  appearance: none;
  border: 0;
  cursor: pointer;
  background-color: hotpink;
  padding: 1rem;
  height: 100%;
  font-weight: bold;
}
</style>