<template>
  <h1>Container Query Experiments</h1>
  <h2>Same container</h2>
  <div class="container grid">
    <div class="desc"></div>
    <div class="desc"></div>
    <div class="desc"></div>
  </div>

  <h2>Multi container</h2>
  <div class="grid">
    <div class="container">
      <div class="desc"></div>
    </div>
    <div class="container">
      <div class="desc"></div>
    </div>
    <div class="container grid">
      <div class="desc full"></div>

      <div class="container">
        <div class="desc"></div>
      </div>
      <div class="container">
        <div class="desc"></div>
      </div>
      <div class="container">
        <div class="desc"></div>
      </div>
    </div>
  </div>

  <h2>Units</h2>
  <div class="container unit-container">
    <div class="unit"></div>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
.container {
  container: test / inline-size;
  color: #000;
  text-align: center;
  box-sizing: border-box;
}

.grid {
  display: grid;
  width: 100%;
  grid-template-columns: 20% 30% 50%;
}

.full {
  grid-column: 1 / -1;
}

.desc {
  padding: 1rem;
  background-color: hotpink;
  height: 100%;
  text-align: center;
  display: grid;
  place-content: center;
  border: #000 5px solid;
}

.desc::before {
  margin: 0 10px;
  content: '<200px';
}

@container (min-width: 200px) {
  .desc {
    background: cyan;
    content: 'min-width: 200px';
  }

  .desc::before {
    content: 'min-width: 200px';
  }
}

@container test (min-width: 400px) {
  .desc {
    background-color: yellow;
  }

  .desc::before {
    content: 'min-width: 400px'
  }
}

.unit-container {
  height: 100px;
  container-name: unit;
}

.unit {
  background-color: cornflowerblue;
  display: grid;
  place-content: center;
  border: #000 5px solid;
  box-sizing: border-box;
  width: 50cqi;
}

.unit::before {
  content: '50cqi';
}

@container unit (min-width: 500px) {

  .unit {
    width: 100%;
    height: 20cqmin;
    background-color: aquamarine;
  }

  .unit::before {
    content: '20cqmin';
  }
}

@container unit (min-width: 800px) {

  .unit {
    width: 100%;
    height: 50cqb;
    background-color: lightyellow;
  }

  .unit::before {
    content: '50cqb';
  }
}
</style>