import { html, css, Script } from "@/site/core";

const doodle = `
:doodle {
  @grid: 7 / 100vmax;
}
@shape: clover 5;
background: hsla(
  calc(360 - @i() * 4), 70%, 68%, @r(.8)
);
transform:
scale(@r(.2, 1.5))
translate(@m2(@r(-50%, 50%)));
`;

export const template = () => html`
  <lab-link to="/">
    <lab-title>Lab.</lab-title>
  </lab-link>
  <lab-container>
    <lab-nav></lab-nav>
    <lab-source-link></lab-source-link>
    <lab-view></lab-view>
  </lab-container>

  <css-doodle>${doodle}</css-doodle>
`;

export const style = css`
  css-doodle {
    position: fixed;
    left: 0;
    top: 0;
    min-width: 100vw;
    min-height: 100vh;
    z-index: -1;
    opacity: 0.2;
  }
`;

export const script: Script = {
  onMount() {
    window.doodle = document.querySelector("css-doodle") as any;
  },
};
