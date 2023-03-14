<template>
  <div class="root">
    <h1><span class="at-layer revert-layer">@</span><span class="at-layer">layer</span> Experiments</h1>

    <p class="text">
      text
    </p>
    <p class="text revert-color">
      text revert
    </p>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
@import "at-layer.css" layer(at-layer);

@layer site,
demo,
this;

.text {
  color: skyblue;
}

.revert-color {
  color: revert-layer;
}

@layer site {
  .text {
    font-size: 1.4rem;
    color: aquamarine;
  }

  .title {
    color: aquamarine;
  }
}

@layer demo {
  .text {
    color: teal;
  }
}

@layer component {
  .text {
    color: hotpink;
  }
}

@layer {
  .text {
    color: wheat;
  }

  .revert {
    color: lightgreen;
  }

  @layer {
    .text {
      color: lawngreen;
    }

  }
}
</style>