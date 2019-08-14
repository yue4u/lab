import { css, html, c, ElementScript } from "../core";
import "css-doodle";

const style = css`
.wrapper{
    height: 40rem;
    overflow:hidden;
}
`;

const script: ElementScript = {
  mounted(el) {
  }
};

const template = html`
<div class="wrapper">
  <css-doodle click-to-update>
      :doodle {
        @grid: 80x1 / 100vw 100vh; 
        @min-size: 100px;
        filter: url(#filter); 
        will-change: transform;
        animation: r 5s linear infinite;
      }
    
      @size: 100% 50%;
      position: absolute;
      top: 25%;
      transform: rotate(@r(360deg));
      perspective: 130px; 
    
      :after {
        content: '';
        position: absolute;
        @size: @r(10px);
        will-change: transform;
        animation: cycle @r(2s, 8s) linear infinite;
        animation-delay: -@r(100s);
        background: @pick('#ffeafe', '#9ea9f0', '#ccc1ff','#ffeafe');
        border-radius:100%;
        box-shadow: @m3(0 0 calc(.5vmin + 5px) @pick('#ffeafe', '#9ea9f0', '#ccc1ff','#ffeafe'));
        --trans: scaleX(@r(.1, 5)) translateZ(105px);
        transform: rotateY(0) @var(--trans);
      }
      @keyframes cycle {
        to {
          transform: rotateY(@p(-1turn, 1turn)) @var(--trans);
        }
      }
      @keyframes r {
        to { transform: rotate(@p(-1turn, 1turn)) }
      }
  </css-doodle>
  <svg style="width: 0; height:0">
  <filter id="filter">
    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
    <feBlend in="SourceGraphic" in2="goo" />
  </filter>
</svg>
</div>
`;

export default c({
  tag: "lab-liquid",
  style,
  script,
  template
});
