import { html, css, Script } from "@/site/core";

export const template = () => html`<div class="container">
  <textarea>5000兆円</textarea>
  <p class="deco"></p>
</div> `;

export const style = css`
  @import url("https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@800&display=blocking");
  .container {
    display: grid;
    grid-template-rows: auto 1fr;
  }
  .deco {
    filter: drop-shadow(#fff 1px 1px 0) drop-shadow(#fff 1px 1px);
    animation: r 5s infinite forwards;
  }
  .deco span {
    word-break: break-all;
    font-family: "Shippori Mincho", serif;
    font-size: 8rem;
    filter: drop-shadow(black 0 0 2px) drop-shadow(black 0 0 2px)
      drop-shadow(black 0 0 2px) drop-shadow(#ffeb3b 0 0 1px)
      drop-shadow(#ffeb3b 1px 1px 0) drop-shadow(#ffeb3b 1px 1px 0)
      drop-shadow(#000 1px 0 1px) drop-shadow(#000 1px 0 1px)
      drop-shadow(#000 1px 0 1px) drop-shadow(#000 1px 0 1px);
    -webkit-text-stroke: 2px #fff;
    width: fit-content;
    display: inline-block;
    font-weight: normal;
    text-align: center;
    -webkit-text-fill-color: transparent;
    background: linear-gradient(
      red,
      rgb(121 3 8) 51%,
      red 53%,
      rgb(65 2 26) 80%
    );
    background-size: 200% 100%;
    background-clip: text;
    font-weight: bold;
    -webkit-background-clip: text;
    font-style: italic;
    padding: 1rem;
    margin: -1rem;
  }
  @keyframes r {
    90% {
      transform: rotate(0);
    }
    95% {
      transform: rotateX(1turn) translateY(10rem);
    }
    100% {
      transform: rotateX(0);
    }
  }
`;

export const script: Script = {
  onMount(root) {
    const content = root.querySelector("p")!;
    const textarea = root.querySelector("textarea")!;
    const update = (text: string) => {
      Array.from(content.children).forEach((element) => {
        element.remove();
      });
      text.split("").forEach((l) => {
        const span = document.createElement("span");
        span.textContent = l;
        content.appendChild(span);
      });
    };
    update(textarea.value);
    textarea.addEventListener("input", (e) => {
      // @ts-ignore
      update(e.target.value);
    });
  },
};
