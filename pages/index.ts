import { html, css, c } from "../core";
import "../components";

const tag = "lab-root";

const style = css`
  main {
    text-align: center;
  }
  lab-wrapper {
    position: absolute;
    left: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: left;
    padding: 0 2rem;
    font-size: 2rem;
  }
`;

const template = html`
  <main>
    <!--
    <lab-title>Tiny Lab 😀 </lab-title>
    <lab-react></lab-react>
    <lab-vue></lab-vue> <lab-nav></lab-nav>
    -->
    <lab-wrapper>
      <lab-...............................................................................................................>
        <lab-...............................................................................................................>
          <lab-...............................................................................................................>
            <lab-nav></lab-nav> </lab-...............................................................................................................
        ></lab-...............................................................................................................>
      </lab-...............................................................................................................>
    </lab-wrapper>
    <lab-liquid></lab-liquid>
  </main>
`;

export default c({
  tag,
  style,
  template
});
