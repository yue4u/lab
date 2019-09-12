<template>
  <h1>
    <span>Here is vue</span>
    <button @click="increase">{{count}}</button>
  </h1>
</template>

<script>
export default {
  data() {
    return {
      count: 0
    };
  },
  methods: {
    increase() {
      this.count += 1;
    }
  }
};
</script>
