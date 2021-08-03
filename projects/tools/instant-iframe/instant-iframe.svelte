<script lang="ts">
  export let src: string;
  export let val: string;
  function update() {
    src = val;
  }
</script>

<div class="container">
  <div class="input">
    <input placeholder="https://..." bind:value={val} />
    <button on:click={update}>update</button>
  </div>
  <iframe title="test-iframe" {src} frameborder="0" />
</div>

<style>
  .container {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100%;
  }
  .input {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  iframe {
    width: 100%;
    height: 100%;
  }
</style>
